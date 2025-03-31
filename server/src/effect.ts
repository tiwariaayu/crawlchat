export function effect(promise: Promise<any>) {
  promise.catch((e) => {
    console.log("Effect failed!", e);
  });
}
