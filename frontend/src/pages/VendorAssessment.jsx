import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentService } from '../services/api';
import { Shield, CheckCircle, AlertCircle, Upload, FileText, Send } from 'lucide-react';

const VendorAssessment = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [existingResponses, setExistingResponses] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);

  useEffect(() => {
    loadAssessment();
  }, [token]);

  const loadAssessment = async () => {
    try {
      const result = await assessmentService.getByToken(token);
      if (result.success) {
        setAssessment(result.data.assessment);
        setQuestionnaire(result.data.questionnaire);
        setQuestions(result.data.questions || []);
        setExistingResponses(result.data.existingResponses || []);
        
        // Pre-populate existing responses
        const initialResponses = {};
        result.data.existingResponses?.forEach(resp => {
          initialResponses[resp.question_id] = resp.answer_json || resp.answer;
        });
        setResponses(initialResponses);

        // Set first section as current
        if (result.data.questions?.length > 0) {
          setCurrentSection(result.data.questions[0].section);
        }
      }
    } catch (err) {
      setError('Failed to load assessment. The link may be expired or invalid.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleFileUpload = async (questionId, file) => {
    // For now, store file name as response
    // In production, this would upload to backend
    handleResponseChange(questionId, file.name);
  };

  const saveProgress = async () => {
    try {
      const formattedResponses = Object.entries(responses).map(([question_id, answer]) => ({
        question_id,
        answer: typeof answer === 'string' ? answer : null,
        answer_json: typeof answer === 'object' ? answer : null
      }));

      await assessmentService.saveResponses(token, formattedResponses);
      alert('Progress saved successfully!');
    } catch (err) {
      alert('Failed to save progress');
      console.error(err);
    }
  };

  const submitAssessment = async () => {
    if (!window.confirm('Are you sure you want to submit this assessment? You won\'t be able to make changes after submission.')) {
      return;
    }

    setSubmitting(true);
    try {
      // Save final responses
      const formattedResponses = Object.entries(responses).map(([question_id, answer]) => ({
        question_id,
        answer: typeof answer === 'string' ? answer : null,
        answer_json: typeof answer === 'object' ? answer : null
      }));

      await assessmentService.saveResponses(token, formattedResponses);
      
      // Submit for analysis
      const result = await assessmentService.submit(token);
      
      if (result.success) {
        setSubmitted(true);
      }
    } catch (err) {
      alert('Failed to submit assessment');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getSections = () => {
    const sections = [...new Set(questions.map(q => q.section))];
    return sections.filter(s => s);
  };

  const getQuestionsForSection = (section) => {
    return questions.filter(q => q.section === section);
  };

  const getResponseCount = () => {
    return Object.keys(responses).filter(k => responses[k]).length;
  };

  const getProgressPercentage = () => {
    if (questions.length === 0) return 0;
    return Math.round((getResponseCount() / questions.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center bg-white p-8 rounded-lg shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for completing the security assessment. Your responses have been received and are being reviewed.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600">Vendor:</p>
            <p className="font-semibold">{assessment?.vendorName}</p>
          </div>
          <p className="text-sm text-gray-500">
            Our team will contact you if we need any additional information.
          </p>
        </div>
      </div>
    );
  }

  const sections = getSections();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Security Assessment</h1>
                <p className="text-sm text-gray-500">{questionnaire?.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-lg font-semibold text-primary-600">{getProgressPercentage()}%</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vendor Info */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vendor Information</h2>
              <p className="text-gray-600">{assessment?.vendorName}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={saveProgress} className="btn-secondary flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Progress</span>
              </button>
              <button 
                onClick={submitAssessment}
                disabled={submitting || getResponseCount() === 0}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Assessment'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        {sections.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex space-x-2 min-w-max">
              {sections.map((section, idx) => {
                const sectionQuestions = getQuestionsForSection(section);
                const answeredCount = sectionQuestions.filter(q => responses[q.id]).length;
                const isComplete = answeredCount === sectionQuestions.length;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentSection(section)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentSection === section
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{section}</span>
                      {isComplete && <CheckCircle className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questions
            .filter(q => !currentSection || q.section === currentSection)
            .map((question, idx) => (
            <div key={question.id} className="card">
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    <span className="text-gray-500 mr-2">{idx + 1}.</span>
                    {question.question_text}
                  </h3>
                  {responses[question.id] && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
                  )}
                </div>
                {question.description && (
                  <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                )}
                {question.control_reference && (
                  <p className="text-xs text-gray-500 mt-1">
                    Reference: {question.control_reference}
                  </p>
                )}
              </div>

              {/* Response Input */}
              {question.question_type === 'yes_no' && (
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value="yes"
                      checked={responses[question.id] === 'yes'}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                      className="form-radio"
                    />
                    <span className="ml-2">Yes</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value="no"
                      checked={responses[question.id] === 'no'}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                      className="form-radio"
                    />
                    <span className="ml-2">No</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value="not_applicable"
                      checked={responses[question.id] === 'not_applicable'}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                      className="form-radio"
                    />
                    <span className="ml-2">Not Applicable</span>
                  </label>
                </div>
              )}

              {question.question_type === 'multiple_choice' && question.options && (
                <div className="space-y-2">
                  {JSON.parse(question.options).map((option, optIdx) => (
                    <label key={optIdx} className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={responses[question.id] === option}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        className="form-radio"
                      />
                      <span className="ml-2">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {(question.question_type === 'text' || question.question_type === 'long_text') && (
                <textarea
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  placeholder="Your response..."
                  rows={question.question_type === 'long_text' ? 5 : 3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              )}

              {question.question_type === 'file_upload' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    {responses[question.id] ? (
                      <span className="text-green-600 flex items-center justify-center">
                        <FileText className="w-4 h-4 mr-2" />
                        {responses[question.id]}
                      </span>
                    ) : (
                      'Drag and drop a file here, or click to select'
                    )}
                  </p>
                  <input
                    type="file"
                    onChange={(e) => e.target.files[0] && handleFileUpload(question.id, e.target.files[0])}
                    className="hidden"
                    id={`file-${question.id}`}
                  />
                  <label htmlFor={`file-${question.id}`} className="btn-secondary inline-block cursor-pointer">
                    Select File
                  </label>
                </div>
              )}

              {/* Additional Comments */}
              {question.allow_comments && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    value={responses[`comment-${question.id}`] || ''}
                    onChange={(e) => handleResponseChange(`comment-${question.id}`, e.target.value)}
                    placeholder="Add any additional context..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex justify-between">
          <button onClick={saveProgress} className="btn-secondary">
            Save Progress
          </button>
          <button 
            onClick={submitAssessment}
            disabled={submitting || getResponseCount() === 0}
            className="btn-primary disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </main>
    </div>
  );
};

// Simple Save icon component
const Save = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

export default VendorAssessment;
