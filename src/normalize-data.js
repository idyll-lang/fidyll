

module.exports = (content, target) => {

  const isInTarget = (d) => {
    if (d.include) {
      return d.include.includes(target);
    }
    else if (d.exclude) {
      return !d.exclude.includes(target);
    }
    else if (d.parsed && d.parsed.include) {
      return d.parsed.include.includes(target);
    }
    else if (d.parsed && d.parsed.exclude) {
      return !d.parsed.exclude.includes(target);
    }
    return true;
  }


  const introduction = content.filter(d => d.type === "text" && isInTarget(d));
  const scenes = content.filter(d => d.type === "scene" && isInTarget(d));
  const conclusion = content.filter(d => d.type === "conclusion" && isInTarget(d));

  scenes.forEach(scene => {
    scene.stages = (scene.stages || []).filter(stage => isInTarget(stage));

    if (scene.forward) {
      scene.stages = [{
        type: "stage",
        text: scene.forward,
        parsed: {
          parameters: {...scene.parsed.parameters}
        }
      },, ...scene.stages];

      delete scene.forward;
    }

    scene.stages.forEach((stage, idx) => {
      if (idx === 0) {
        stage.parsed.parameters = { ...scene.parsed.parameters, ...stage.parsed.parameters}
      } else {
        stage.parsed.parameters = { ...scene.stages[idx - 1].parsed.parameters, ...stage.parsed.parameters}
      }
    })
  });

  const normalized = {
    introduction,
    scenes,
    conclusion
  }

  console.log(JSON.stringify(normalized, null, 2));

  return content;
}