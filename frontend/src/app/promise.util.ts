/**
 * Throws error if promise does not complete in the given time value
 * @param p promise ti watch
 * @param t timeout
 * @returns promise
 */
export function promiseTimeout<T>(p: Promise<T>, t: number): Promise<T> {
  return Promise.race([
    new Promise<T>((resolve, reject) => {
      setTimeout(() => reject('timeout'), t)
    }),
    p
  ]);
}

/**
 * Promise implementation of setTimeout
 * @param cb callback
 * @param delay delay
 * @returns promise
 */
export function promiseDelay(delay: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), delay));
}
