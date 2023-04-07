//global.performance = require('perf_hooks').performance;
Object.defineProperty(window.performance, 'measure', {
  value: () => {}
});
