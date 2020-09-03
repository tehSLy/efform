export type PickOnly<O, T> = {[key in keyof O]: O[key] extends T ? key : never}[keyof O];
