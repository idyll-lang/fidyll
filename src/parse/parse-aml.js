


const matter = require('gray-matter');
const yaml = require('js-yaml');

const preprocess = (text) => {
    text = text.replace(/\:([^\s\n])/g, ': $1');
    text = text.replace(/https\: \/\//g, 'https://');
    return text.trim();
}

const flexibleParseYaml = (text) => {
    // console.log('---------\nparsing yml\n---------\n', text, '\n\n');
    return yaml.load(text);
}

module.exports = (text) => {

    text = preprocess(text);

    const { content, data: header } = matter(text);

    const states = {
        PRE_SCENE: 'PRE_SCENE',
        SCENE_YML: 'SCENE_YML',
        PRE_STAGE: 'PRE_STAGE',
        STAGE_YML: 'STAGE_YML',
        STAGE: 'STAGE',
        CONCLUSION: 'CONCLUSION',
        CONCLUSION_YML: 'CONCLUSION_YML',
    }

    let currentState = states.PRE_SCENE;

    let parsedContent = [];
    let currentContent = null;
    let currentScene = null;

    content.split('\n').forEach((line) => {
        // console.log(currentState, line);
        switch(currentState) {
            case states.PRE_SCENE:
                if (line.trim().match(/\s*{scene}/g)) { // starting the first scene
                    if (currentContent) {
                        parsedContent.push(currentContent);
                        currentContent = null;
                    }
                    currentState = states.SCENE_YML;
                    break;
                } else if (line.trim()) { // text before any scenes declared
                    if (!currentContent) {
                        currentContent = {
                            type: 'text',
                            text: ''
                        }
                    }
                    currentContent.text += '\n' + line
                }
                break;
            case states.SCENE_YML:
                if (!line.trim() || line.trim() === '{}') { // empty line, the yaml is over

                    if (!currentContent) {
                        throw new Error('Scene declared with no information.');
                    }

                    try {
                        currentContent.parsed = flexibleParseYaml(currentContent.raw);
                    } catch(e) {
                        console.log('Error parscing scene YAML', e);
                    }
                    currentState = states.PRE_STAGE;
                } else { // this is the yaml
                    if (!currentContent) {
                        currentContent = {
                            type: 'scene',
                            text: '',
                            raw: '',
                            foreward: '',
                            stages: []
                        }
                        currentScene = currentContent;
                    }
                    currentContent.raw += '\n' + line;
                }
                break;
            case states.PRE_STAGE:
                if (line.trim().match(/\s*{stage}/g)) { // starting the first stage
                    parsedContent.push(currentContent);
                    currentContent = null;
                    currentState = states.STAGE_YML;
                } else if (line.trim().match(/\s*{scene}/g)) {
                    parsedContent.push(currentContent);
                    currentContent = null;
                    currentState = states.SCENE_YML;
                } else {
                    currentContent.foreward += '\n' + line;
                }
                break;
            case states.STAGE_YML:
                if (!line.trim() || line.trim() === '{}') { // empty line, the yaml is over
                    if (!currentContent) {
                        throw new Error('Stage declared with no information.');
                    }

                    try {
                        currentContent.parsed = flexibleParseYaml(currentContent.raw);
                    } catch(e) {
                        console.log('Error parsing stage YAML', e);
                    }
                    currentState = states.STAGE;
                } else { // this is the yaml
                    if (!currentContent) {
                        currentContent = {
                            type: 'stage',
                            text: '',
                            raw: ''
                        }
                    }
                    currentContent.raw += '\n' + line;
                }
                break;

            case states.STAGE:
                if (line.trim().match(/\s*{stage}/g)) { // starting a new stage
                    currentScene.stages.push(currentContent);
                    currentContent = null;
                    currentState = states.STAGE_YML;
                } else if (line.trim().match(/\s*{scene}/g)) { // starting a new scene
                    currentScene.stages.push(currentContent);
                    currentContent = null;
                    currentState = states.SCENE_YML;
                } else if (line.trim().match(/\s*{conclusion}/g)) { // starting the conclusion
                    currentScene.stages.push(currentContent);
                    currentContent = null;
                    currentState = states.CONCLUSION_YML;
                } else {
                    currentContent.text += '\n' + line;
                }
                break;
            case states.CONCLUSION_YML:
                if (!currentContent) {
                    currentContent = {
                        type: 'conclusion',
                        text: '',
                        raw: ''
                    }
                }
                if (!line.trim() || line.trim() === '{}' || !line.trim().match(/\:/g)) { // empty line, the yaml is over
                    try {
                        currentContent.parsed = flexibleParseYaml(currentContent.raw);
                    } catch(e) {
                        console.log('Error parsing stage YAML', e);
                    }
                    if((line.trim() || line.trim() !== '{}') && !line.trim().match(/\:/g)) {
                        currentContent.text += '\n' + line;
                    }
                    currentState = states.CONCLUSION;
                } else { // this is the yaml
                    currentContent.raw += '\n' + line;
                }
                break;
        case states.CONCLUSION:
            currentContent.text += '\n' + line;
            break;
        }
    })

    if (currentContent) {
        if (currentContent.type === 'stage') {
            currentScene.stages.push(currentContent);
        } else {
            parsedContent.push(currentContent);
        }
    }

    return {
        header: header,
        content: parsedContent
    }

}