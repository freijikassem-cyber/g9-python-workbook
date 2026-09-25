const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';
importScripts(PYODIDE + 'pyodide.js');
const ready = (async () => {
  const py = await loadPyodide({ indexURL: PYODIDE });
  const response = await fetch('grader.py');
  if (!response.ok) throw new Error('Could not load the answer checker.');
  py.runPython(await response.text());
  return py;
})();
ready
  .then(() => self.postMessage({ ready: true }))
  .catch(() => self.postMessage({ fatal: true }));
self.onmessage = async ({ data }) => {
  try {
    const py = await ready;
    const run = py.globals.get('run_batch');
    try {
      self.postMessage({
        id: data.id,
        results: JSON.parse(run(JSON.stringify(data))),
      });
    } finally {
      run.destroy();
    }
  } catch {
    self.postMessage({
      id: data.id,
      error:
        'The answer checker could not finish. Please try again. Your mark has not changed.',
    });
  }
};
