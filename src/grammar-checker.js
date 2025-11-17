/**
 * Grammar Checker Module
 * Uses Copyleaks Writing Assistant API for grammar, spelling, and style checking
 */
class GrammarChecker {
  constructor(copyleaksClient) {
    this.client = copyleaksClient;
    this.apiEndpoint = 'https://api.copyleaks.com/v3/writer/check';
  }

  /**
   * Check text for grammar, spelling, and style errors
   * @param {string} text - Text to check
   * @param {object} options - Check options
   * @returns {Promise<object>} Grammar check results with error positions
   */
  async checkText(text, options = {}) {
    const {
      language = 'en',
      sandbox = false
    } = options;

    try {
      console.log(`📝 Checking grammar for text (${text.length} characters)...`);

      const requestBody = {
        text: text,
        language: language,
        sandbox: sandbox
      };

      // Make authenticated request to Writing Assistant API
      const result = await this.client.makeRequest(
        this.apiEndpoint,
        'POST',
        requestBody
      );

      console.log(`✓ Grammar check completed: ${result.corrections?.length || 0} issues found`);

      return this.normalizeResult(result, text);

    } catch (error) {
      console.error('✗ Grammar check failed:', error.response?.data || error.message);

      // Check if it's a 404 or method not allowed - API might not be available
      if (error.response?.status === 404 || error.response?.status === 405) {
        console.warn('⚠️  Writing Assistant API endpoint may not be available in your plan');
        console.warn('⚠️  Returning empty grammar results');
        return this.getEmptyResult(text);
      }

      throw new Error(`Grammar check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Normalize API response to consistent format
   * @param {object} apiResult - Raw API response
   * @param {string} originalText - Original text that was checked
   * @returns {object} Normalized result
   */
  normalizeResult(apiResult, originalText) {
    const corrections = apiResult.corrections || [];

    // Categorize errors by type
    const categorized = {
      grammar: [],
      spelling: [],
      punctuation: [],
      style: []
    };

    const allErrors = [];

    corrections.forEach(correction => {
      const normalized = {
        type: correction.type || 'grammar',
        message: correction.message || 'Error detected',
        suggestion: correction.suggestion || '',
        replacements: correction.replacements || [],
        position: {
          start: correction.position?.start || 0,
          length: correction.position?.length || 0
        },
        severity: correction.severity || 'warning',
        affectedText: originalText.substring(
          correction.position?.start || 0,
          (correction.position?.start || 0) + (correction.position?.length || 0)
        )
      };

      allErrors.push(normalized);

      // Categorize
      const category = normalized.type.toLowerCase();
      if (categorized[category]) {
        categorized[category].push(normalized);
      } else {
        categorized.grammar.push(normalized);
      }
    });

    // Calculate statistics
    const statistics = {
      totalErrors: allErrors.length,
      grammarErrors: categorized.grammar.length,
      spellingErrors: categorized.spelling.length,
      punctuationErrors: categorized.punctuation.length,
      styleIssues: categorized.style.length,
      errorsByType: Object.keys(categorized).reduce((acc, key) => {
        acc[key] = categorized[key].length;
        return acc;
      }, {})
    };

    return {
      success: true,
      text: originalText,
      textLength: originalText.length,
      errors: allErrors,
      categorized: categorized,
      statistics: statistics,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Get empty result (for when API is unavailable)
   * @param {string} originalText - Original text
   * @returns {object} Empty result object
   */
  getEmptyResult(originalText) {
    return {
      success: true,
      text: originalText,
      textLength: originalText.length,
      errors: [],
      categorized: {
        grammar: [],
        spelling: [],
        punctuation: [],
        style: []
      },
      statistics: {
        totalErrors: 0,
        grammarErrors: 0,
        spellingErrors: 0,
        punctuationErrors: 0,
        styleIssues: 0,
        errorsByType: {}
      },
      checkedAt: new Date().toISOString(),
      warning: 'Writing Assistant API may not be available in your plan'
    };
  }

  /**
   * Get grammar errors by severity
   * @param {object} grammarResult - Result from checkText()
   * @param {string} severity - Severity level (error, warning, info)
   * @returns {array} Filtered errors
   */
  getErrorsBySeverity(grammarResult, severity) {
    return grammarResult.errors.filter(error => error.severity === severity);
  }

  /**
   * Get grammar errors by type
   * @param {object} grammarResult - Result from checkText()
   * @param {string} type - Error type (grammar, spelling, etc.)
   * @returns {array} Filtered errors
   */
  getErrorsByType(grammarResult, type) {
    return grammarResult.categorized[type] || [];
  }

  /**
   * Extract positions for highlighting
   * @param {object} grammarResult - Result from checkText()
   * @returns {array} Array of {start, length, type, message}
   */
  extractHighlightPositions(grammarResult) {
    return grammarResult.errors.map(error => ({
      start: error.position.start,
      length: error.position.length,
      type: error.type,
      severity: error.severity,
      message: error.message,
      suggestion: error.suggestion,
      replacements: error.replacements
    }));
  }
}

module.exports = GrammarChecker;
