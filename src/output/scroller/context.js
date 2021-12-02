import TWEEN from 'tween.js';


module.exports = (ctx) => {
  // Wait for the context to initialize
  ctx.onInitialize(() => {
    // Inject the animation() function
    // for use in Idyll expressions
    ctx.update({
       animate: (key, value, time) => {
          let _tween = { value : ctx.data()[key] };
          new TWEEN.Tween(_tween)
            .to({value: value}, time === undefined ? 750 : time)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
              const updated = {};
              updated[key] = _tween.value;
              ctx.update(updated);
            }).start();
       }
    })
  })

  // Wait for the context to load in a browser
  ctx.onMount(() => {
    // Tell TWEEN to start listening for animations
    const listenForAnimations = () => {
      const update = TWEEN.update();
      requestAnimationFrame(listenForAnimations);
    };
    listenForAnimations();
  })
}