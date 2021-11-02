# Gridyll

Research project for cross-platform Idyll projects.

**Note: This code is not yet hosted on NPM. Use at your own peril for now.**

## Installation

Clone this repo, run `npm install`, `npm link`.

You should now have access to the `gridyll` and `gridyll deploy` commands.

## Usage

To render an article, `gridyll index.aml`. If you are creating a video, You also need to set the credentials to a Google Cloud account (e.g. `export GOOGLE_APPLICATION_CREDENTIALS="/Users/mathisonian/Documents/google-cloud.json"`). You may need to specify the path to FFMPEG, in that case run the command like: `FFMPEG_PATH=path/to/ffmpeg gridyll index.aml`.

Once you are happy with the output, use the deploy script to generat static web output `gridyll-deploy output/`. This will create a folder called `deploy/`. You can upload the contents of this folder to any static web hosting service.

## Writing a Gridyll Article

Gridyll articles are written using a modified version of ArchieML and use the .aml file extension. See the
code snippet below for an example article:

```aml
---
title: Article Title
subtitle: Subtitle
author: Your Name
authorLink: https://idl.cs.washington.edu/
targets:
    - static
    - presentation
    - scroller
data:
   exampleJSON: data.json
   exampleCSV: data.csv
---


Introductory text goes here....

{scene}
summary: A scene is the top level object. Each scene has a graphic and multiple stages.
graphic: MyJavascriptGraphic
parameters:
    paramA: false
    paramB: 0
appendix:
    paramA:
        set: [true, false]
    paramB:
        range: [0, 10, 0.5]

When defining a scene you define all the parameters associated with it. These parameters will be passed into the graphic along with any datasets defined in the header. If an appendix option is defined, it is used to create an appendix in static versions of the document by creating the graphic for each entry in the cross product of all of the parameters.

{stage}
summary: A stage consists of a set of parameter values, and optionally a set of controls.
parameters:
    paramB: 0.5

This text will be displayed in association with the graphic while paramB is set to 0.5. In certain templates, such as the presentation, the detailed text is not displayed for the user, instead the summary text is shown. In that case the detailed text can still be accessed via the presenter notes.


{stage}
summary: This stage has controls. These are optional.
parameters:
    paramA: true
controls:
    paramB:
        range: [0, 10, 0.5]


A slider will automatically be added to the document that allows a reader to manipulate the paramB variable. As they do the updated value of paramB will be
passed to the graphic and it will re-render.


{scene}
summary: You can create graphics using server-side scripts if you prefer.
script: ./scripts/myscript.jl
parameters:
    paramA: false
    paramB: 0

If you prefer to use a server-side scripting language like Julia or Python you can point to a script. The script will be called with all of the
relevant parameters, as well as a filepath where an image should be generated.

The script can do anything you want it to do, but it ultimately must produce an image at the provided filepath.

{stage}
summary: Everything else is the same with server-side scripts. You can still use controls.
controls:
    paramA:
        set: [true, false]
    paramB:
        range: [0, 10, 0.5]

If using a server-side script all you have to do is change the `graphic` keyword to `script`. All of the other properties remain the same.

{stage}
summary: Not every stage or scene has to be included in all output formats.
parameters:
  paramA: true
include:
  - scroller
  - presentation

This stage will only be included in the scroller and presentation formats.


{stage}
summary: Not every stage or scene has to be included in all output formats.
parameters:
  paramA: true
exclude:
  - scroller

This stage will be included in all formats except the scroller. The include and exclude keywords can be applied to
any scene or stage.

{scene}
summary: During development you may want to skip some scenes to speed up load times.
graphic: ExampleGraphic
parameters:
  paramA: true
skip:true

Use the skip flag to skip any scene that you don't want to see.

{scene}
summary: During development you may want to focus on just one scene.
graphic: ExampleGraphic
parameters:
  paramA: true
only:false

If the only keyword is set to true, then only this scene will be rendered.

```

