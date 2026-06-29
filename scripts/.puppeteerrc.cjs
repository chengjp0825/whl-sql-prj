const { join } = require('path');

/**
 * Puppeteer configuration for @mermaid-js/mermaid-cli
 * Uses system Chrome instead of downloading chrome-headless-shell
 */
module.exports = {
  // Point to system Chrome installation
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  // Skip downloading browsers
  skipDownload: true,
};
