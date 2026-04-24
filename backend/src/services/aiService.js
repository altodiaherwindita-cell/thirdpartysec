const OpenAI = require('openai');
const { logger } = require('../config/logger');

// Initialize OpenAI client (or compatible API)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Analyze vendor assessment responses using AI
 * @param {Array} responses - Array of assessment responses with question details
 * @returns {Object} AI analysis result
 */
const analyzeAssessment = async (responses) => {
  // If no API key configured, return mock analysis
  if (!openai) {
    logger.warn('OpenAI not configured, using rule-based analysis');
    return performRuleBasedAnalysis(responses);
  }

  try {
    // Prepare context for AI
    const context = prepareAnalysisContext(responses);

    const prompt = `
You are a cybersecurity and GRC expert analyzing a third-party vendor security assessment.
Analyze the vendor's responses and provide a structured risk assessment.

## Assessment Responses:
${context}

## Task:
Analyze these responses and provide:
1. Overall risk level (low, medium, high, critical)
2. Key security issues identified
3. Control gaps based on ISO 27001:2022
4. Specific recommendations for mitigation

## Output Format (JSON only):
{
  "risk_level": "low|medium|high|critical",
  "risk_score": 0-100,
  "issues": [
    {
      "description": "Clear description of the issue",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high",
      "risk_level": "low|medium|high|critical",
      "recommendation": "Specific mitigation action",
      "control_reference": "ISO 27001 control reference if applicable"
    }
  ],
  "strengths": ["List of security strengths"],
  "gaps": ["Control gaps identified"],
  "recommendations": ["Top priority recommendations"],
  "follow_up_questions": ["Questions that need clarification"],
  "summary": "Executive summary of the security posture"
}

Important:
- Be critical but fair in your assessment
- Flag any suspicious or inconsistent answers
- Consider the sensitivity of data being shared
- Highlight missing evidence or vague responses
- Align recommendations with ISO 27001:2022 and industry best practices
`;

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity GRC expert. Output ONLY valid JSON. No markdown, no explanations outside JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    logger.info('AI analysis completed', { 
      riskLevel: analysis.risk_level,
      issuesCount: analysis.issues?.length || 0 
    });

    return analysis;
  } catch (error) {
    logger.error('AI analysis failed', { error: error.message });
    // Fallback to rule-based analysis
    return performRuleBasedAnalysis(responses);
  }
};

/**
 * Perform rule-based analysis when AI is not available
 */
const performRuleBasedAnalysis = (responses) => {
  let totalScore = 0;
  let maxScore = 0;
  const issues = [];
  const strengths = [];
  const gaps = [];

  responses.forEach(response => {
    maxScore += 1;

    // Score yes/no questions
    if (response.question_type === 'yes_no') {
      if (response.answer === 'yes' || response.answer === 'true') {
        totalScore += 1;
        
        // Check for potential red flags in specific controls
        if (isCriticalControl(response.control_reference) && response.answer === 'no') {
          issues.push({
            description: `Critical control not implemented: ${response.question_text}`,
            likelihood: 'high',
            impact: 'high',
            risk_level: 'high',
            recommendation: 'Implement this critical security control immediately',
            control_reference: response.control_reference
          });
        }
      } else {
        // Identify gaps from negative answers
        if (isCriticalControl(response.control_reference)) {
          issues.push({
            description: `Missing critical control: ${response.question_text}`,
            likelihood: 'medium',
            impact: 'high',
            risk_level: 'high',
            recommendation: 'Prioritize implementation of this control',
            control_reference: response.control_reference
          });
          gaps.push(response.control_reference || response.question_text);
        }
      }
    }

    // Score other question types partially
    if (response.question_type === 'multiple_choice') {
      totalScore += 0.7;
    }
    
    if (response.question_type === 'text' || response.question_type === 'file_upload') {
      if (response.answer && response.answer.length > 20) {
        totalScore += 0.6;
      } else {
        gaps.push(`Incomplete response for: ${response.question_text}`);
      }
    }
  });

  // Calculate risk level
  const riskScore = Math.round((totalScore / maxScore) * 100);
  let risk_level = 'medium';
  
  if (riskScore >= 80) risk_level = 'low';
  else if (riskScore >= 60) risk_level = 'medium';
  else if (riskScore >= 40) risk_level = 'high';
  else risk_level = 'critical';

  // Add strengths based on positive responses
  if (riskScore >= 70) {
    strengths.push('Strong overall security posture');
  }

  return {
    risk_level,
    risk_score: riskScore,
    issues: issues.slice(0, 10), // Limit to top 10 issues
    strengths,
    gaps: gaps.slice(0, 10),
    recommendations: generateRecommendations(issues, gaps),
    follow_up_questions: [],
    summary: generateSummary(risk_level, riskScore, issues.length)
  };
};

/**
 * Check if a control reference is critical
 */
const isCriticalControl = (controlRef) => {
  if (!controlRef) return false;
  
  const criticalControls = [
    'A.5.15', // Access control
    'A.8.24', // Cryptography
    'A.8.29', // Security testing
    'A.5.23', // Information security incident management
    'A.8.12', // Data leakage prevention
    'A.5.30', // ICT readiness for business continuity
  ];
  
  return criticalControls.some(c => controlRef.includes(c));
};

/**
 * Generate recommendations based on issues
 */
const generateRecommendations = (issues, gaps) => {
  const recommendations = [];
  
  if (issues.some(i => i.risk_level === 'high' || i.risk_level === 'critical')) {
    recommendations.push('Immediately address high-risk security gaps');
  }
  
  if (gaps.length > 5) {
    recommendations.push('Conduct comprehensive security review');
  }
  
  recommendations.push('Request additional evidence for critical controls');
  recommendations.push('Schedule follow-up assessment in 90 days');
  recommendations.push('Consider requiring remediation plan before contract renewal');
  
  return recommendations;
};

/**
 * Generate executive summary
 */
const generateSummary = (riskLevel, riskScore, issuesCount) => {
  const summaries = {
    low: `The vendor demonstrates a strong security posture with a risk score of ${riskScore}/100. ${issuesCount} minor issues were identified that should be monitored.`,
    medium: `The vendor has an acceptable security posture with a risk score of ${riskScore}/100. ${issuesCount} issues require attention and remediation planning.`,
    high: `The vendor presents elevated security risks with a risk score of ${riskScore}/100. ${issuesCount} significant issues require immediate attention before proceeding.`,
    critical: `The vendor presents unacceptable security risks with a risk score of ${riskScore}/100. ${issuesCount} critical issues must be resolved before any data sharing can occur.`
  };
  
  return summaries[riskLevel] || summaries.medium;
};

/**
 * Prepare context string for AI analysis
 */
const prepareAnalysisContext = (responses) => {
  return responses.map(r => {
    return `[${r.control_reference || 'N/A'}] ${r.question_text}\nAnswer: ${r.answer || 'No response'}\n`;
  }).join('\n---\n');
};

/**
 * Get AI assistance for a specific question (vendor assist mode)
 */
const getQuestionGuidance = async (questionText, questionType) => {
  if (!openai) {
    return getDefaultGuidance(questionText, questionType);
  }

  try {
    const prompt = `
Provide helpful guidance for answering this security questionnaire question.
Do NOT provide the answer directly, but explain what the question is asking and what evidence might be relevant.

Question: ${questionText}
Type: ${questionType}

Provide a brief, helpful explanation (2-3 sentences) that helps the vendor understand what is being asked.
`;

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant explaining security concepts. Be clear and concise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 200
    });

    return {
      guidance: completion.choices[0].message.content,
      type: 'ai_generated'
    };
  } catch (error) {
    logger.warn('AI guidance failed, using defaults', { error: error.message });
    return getDefaultGuidance(questionText, questionType);
  }
};

/**
 * Default guidance when AI is not available
 */
const getDefaultGuidance = (questionText, questionType) => {
  const guidanceMap = {
    'encryption': 'Explain how you protect data using encryption technologies, both when stored and during transmission.',
    'access control': 'Describe your processes for controlling who can access systems and data.',
    'incident': 'Outline your procedures for detecting, responding to, and recovering from security incidents.',
    'backup': 'Explain your data backup and recovery procedures.',
    'training': 'Describe your security awareness training program for employees.'
  };

  const lowerQuestion = questionText.toLowerCase();
  for (const [key, guidance] of Object.entries(guidanceMap)) {
    if (lowerQuestion.includes(key)) {
      return { guidance, type: 'default' };
    }
  }

  return {
    guidance: 'Please provide a detailed response with any supporting documentation or evidence that demonstrates your security controls.',
    type: 'default'
  };
};

module.exports = {
  analyzeAssessment,
  getQuestionGuidance,
  performRuleBasedAnalysis
};
