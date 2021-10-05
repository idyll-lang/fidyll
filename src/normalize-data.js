

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

  const isSkipped = (d) => {
    if (d.parsed && d.parsed.skip) {
      return true;
    }
    return false;
  }

  const isSoloed = (d) => {
    if (d.parsed && d.parsed.only) {
      return true;
    }
    return false;
  }


  let introduction = content.filter(d => d.type === "text" && isInTarget(d));
  let scenes = content.filter(d => d.type === "scene" && isInTarget(d) && !isSkipped(d));
  let conclusion = content.filter(d => d.type === "conclusion" && isInTarget(d));

  if (scenes.some(d => isSoloed(d))) {
    scenes = scenes.filter(d => isSoloed(d));
  }

  scenes.forEach(scene => {
    scene.stages = (scene.stages || []).filter(stage => isInTarget(stage));

    if (scene.foreward) {
      scene.stages = [{
        type: "stage",
        text: scene.foreward,
        parsed: {
          parameters: {...((scene.parsed || {}).parameters || {})}
        }
      }, ...scene.stages];

      delete scene.foreward;
    }

    scene.stages.forEach((stage, idx) => {
      if (idx === 0) {
        const _stageParams = stage.parsed && stage.parsed.parameters ? {...stage.parsed.parameters} : {}
        stage.parsed = { ...scene.parsed, ...stage.parsed };
        console.log(scene);
        stage.parsed.parameters = { ...scene.parsed.parameters, ..._stageParams };
      } else {
        // console.log('idx', idx)
        // console.log(scene.stages);
        stage.parsed.parameters = { ...(scene.stages[idx - 1].parsed.parameters), ...stage.parsed.parameters}
      }
    })
  });

  const normalized = {
    introduction,
    scenes,
    conclusion
  }

  // console.log(JSON.stringify(normalized, null, 2));

  return normalized;
}