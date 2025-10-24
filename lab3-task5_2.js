importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide...");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded pyodide!");
  const data_archives = [];
  for (const archive of data_archives) {
    let zipResponse = await fetch(archive);
    let zipBinary = await zipResponse.arrayBuffer();
    self.postMessage({type: 'status', msg: `Unpacking ${archive}`})
    self.pyodide.unpackArchive(zipBinary, "zip");
  }
  await self.pyodide.loadPackage("micropip");
  self.postMessage({type: 'status', msg: `Installing environment`})
  try {
    await self.pyodide.runPythonAsync(`
      import micropip
      await micropip.install(['https://cdn.holoviz.org/panel/wheels/bokeh-3.8.0-py3-none-any.whl', 'https://cdn.holoviz.org/panel/1.8.2/dist/wheels/panel-1.8.2-py3-none-any.whl', 'pyodide-http', 'matplotlib']);
    `);
  } catch(e) {
    console.log(e)
    self.postMessage({
      type: 'status',
      msg: `Error while installing packages`
    });
  }
  console.log("Environment loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(`\nimport asyncio\n\nfrom panel.io.pyodide import init_doc, write_doc\n\ninit_doc()\n\nfrom panel import state as _pn__state\nfrom panel.io.handlers import CELL_DISPLAY as _CELL__DISPLAY, display, get_figure as _get__figure\n\nimport panel as pn\nimport matplotlib.pyplot as plt\nimport matplotlib\n\npn.extension()\n\nmd_top = pn.pane.Markdown("""\n# Matplotlib Plot\nA cell with text and a code snippet\n""")\n\nmd_bottom = pn.pane.Markdown("""\n## TODO: Document this properly\n""")\n\nwidgets = {\n    'apple': pn.widgets.IntSlider(name='Apple', start=0, end=150, value=40),\n    'blueberry': pn.widgets.IntSlider(name='Blueberry', start=0, end=150, value=100),\n    'cherry': pn.widgets.IntSlider(name='Cherry', start=0, end=150, value=30),\n    'orange': pn.widgets.IntSlider(name='Orange', start=0, end=150, value=55),\n}\n\ndef create_plot(apple, blueberry, cherry, orange):\n    fig, ax = plt.subplots()\n    \n    fruits = ["apple", "blueberry", "cherry", "orange"]\n    bar_labels = ["red", "blue", "_red", "orange"]\n    bar_colors = ["tab:red", "tab:blue", "tab:red", "tab:orange"]\n    \n    counts = [apple, blueberry, cherry, orange]\n    \n    ax.bar(fruits, counts, label=bar_labels, color=bar_colors)\n    ax.set_ylabel("fruit supply")\n    ax.set_title("Fruit supply by kind and color")\n    ax.legend(title="Fruit colors")\n    \n    plt.close(fig)\n    \n    return fig\n\nbound_plot_pane = pn.pane.Matplotlib(\n    pn.bind(create_plot, **widgets), \n    tight=True,\n    sizing_mode='stretch_width'\n)\n\napp_layout = pn.Row(\n    pn.Column(*widgets.values(), width=300),\n    bound_plot_pane\n)\n\ncode_for_display = f"""\nimport panel as pn\nimport matplotlib.pyplot as plt\nimport matplotlib\n\npn.extension()\n\nwidgets = {{\n    'apple': pn.widgets.IntSlider(name='Apple', start=0, end=150, value=40),\n    'blueberry': pn.widgets.IntSlider(name='Blueberry', start=0, end=150, value=100),\n    'cherry': pn.widgets.IntSlider(name='Cherry', start=0, end=150, value=30),\n    'orange': pn.widgets.IntSlider(name='Orange', start=0, end=150, value=55),\n}}\n\ndef create_plot(apple, blueberry, cherry, orange):\n    fig, ax = plt.subplots()\n    fruits = ["apple", "blueberry", "cherry", "orange"]\n    counts = [apple, blueberry, cherry, orange]\n    bar_labels = ["red", "blue", "_red", "orange"]\n    bar_colors = ["tab:red", "tab:blue", "tab:red", "tab:orange"]\n    \n    ax.bar(fruits, counts, label=bar_labels, color=bar_colors)\n    ax.set_ylabel("fruit supply")\n    ax.set_s_title("Fruit supply by kind and color")\n    ax.legend(title="Fruit colors")\n    plt.close(fig)\n    return fig\n\nbound_plot_pane = pn.pane.Matplotlib(\n    pn.bind(create_plot, **widgets), \n    tight=True,\n    sizing_mode='stretch_width'\n)\n\napp_layout = pn.Row(\n    pn.Column(*widgets.values(), width=300),\n    bound_plot_pane\n)\n\napp_layout.servable()\n"""\n\nfinal_dashboard = pn.Column(\n    md_top,\n    pn.Tabs(\n        ('Application', app_layout),\n        ('Code', pn.Column(md_bottom, pn.pane.Markdown(f"\`\`\`python\\n{code_for_display}\\n\`\`\`"), sizing_mode='stretch_width'))\n    ),\n    sizing_mode='stretch_width'\n)\n\n_pn__state._cell_outputs['51cea545-297e-41dd-aa45-8a5c1def69bd'].append((final_dashboard.servable()))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['51cea545-297e-41dd-aa45-8a5c1def69bd'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['51cea545-297e-41dd-aa45-8a5c1def69bd'].append(_fig__out)\n\n\nawait write_doc()`)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.globals.set('patch', msg.patch)
    self.pyodide.runPythonAsync(`
    from panel.io.pyodide import _convert_json_patch
    state.curdoc.apply_json_patch(_convert_json_patch(patch), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.globals.set('location', msg.location)
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads(location)
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()