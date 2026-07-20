const messages = {
  evalCase: {
    title: 'Reproducible cases',
    hint: 'Save small cases and re-run them with contains assertions. Export a local evidence JSON — no cloud required.',
    addTitle: 'Add / edit case',
    listTitle: 'Cases ({count})',
    empty: 'No cases yet',
    fields: {
      name: 'Case name',
      input: 'User input / task for the model',
      systemPromptOptional: 'System prompt (optional)',
      contains: 'Output must contain…',
    },
    add: 'Add case',
    update: 'Update case',
    runAll: 'Run all',
    export: 'Export evidence',
    resultsTitle: 'Last run',
    summary: 'Total {total} · passed {passed} · failed {failed}',
    pass: 'Pass',
    fail: 'Fail',
    model: 'Model: {model}',
    open: 'Cases',
    saved: 'Case saved',
    removed: 'Case removed',
    runDone: 'Run finished',
    exportDone: 'Evidence exported',
    needModel: 'Select a model first',
    needServices: 'Services not ready',
  },
}

export default messages
