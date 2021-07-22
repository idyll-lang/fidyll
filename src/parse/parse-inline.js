

module.exports = (text, variableMap, controls) => {
    return text.replace(/\{([^\}]+)\}/g, (match, groups) => {
        const body = groups[0].trim();

        if (variableMap[body]) {
            // figure out what to replace it with
            const _varname = variableMap[body];
            if (controls[body]) {
                if (controls[body].range) {
                    const [min, max, step=1] = controls[body].range;
                    return `[Dynamic value:${_varname} min:${min} max:${max} step:${step} /]`;
                }

                if (controls[body].set) {
                    const _set = new Set(controls[body].set);
                    if (_set.has(true) && _set.has(false) && _set.size === 2) {
                        return `[Boolean value:${_varname} /]`;
                    }
                    return `[Select value:${_varname} options:\`${controls[body].set}\` /]`;
                }
            } else {
                return `[Display value:${_varname} /]`;
            }
        }
    })
}
