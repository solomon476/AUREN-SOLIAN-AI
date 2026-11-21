import '@testing-library/jest-dom';

// Global test setup mocks
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
