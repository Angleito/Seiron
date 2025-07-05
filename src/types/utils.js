"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreeM = exports.StateM = exports.Parsers = exports.composeLens = exports.lens = exports.AsyncUtils = exports.memoize = exports.partial = exports.curry = exports.pipe = exports.compose = exports.EitherM = exports.Maybe = void 0;
exports.Maybe = {
    some: (value) => ({ _tag: 'Some', value }),
    none: () => ({ _tag: 'None' }),
    map: (option, fn) => option._tag === 'Some' ? exports.Maybe.some(fn(option.value)) : exports.Maybe.none(),
    flatMap: (option, fn) => option._tag === 'Some' ? fn(option.value) : exports.Maybe.none(),
    filter: (option, predicate) => option._tag === 'Some' && predicate(option.value) ? option : exports.Maybe.none(),
    getOrElse: (option, defaultValue) => option._tag === 'Some' ? option.value : defaultValue,
    fold: (option, onNone, onSome) => option._tag === 'Some' ? onSome(option.value) : onNone()
};
exports.EitherM = {
    left: (value) => ({ _tag: 'Left', left: value }),
    right: (value) => ({ _tag: 'Right', right: value }),
    map: (either, fn) => either._tag === 'Right' ? exports.EitherM.right(fn(either.right)) : either,
    mapLeft: (either, fn) => either._tag === 'Left' ? exports.EitherM.left(fn(either.left)) : either,
    flatMap: (either, fn) => either._tag === 'Right' ? fn(either.right) : either,
    fold: (either, onLeft, onRight) => either._tag === 'Left' ? onLeft(either.left) : onRight(either.right),
    swap: (either) => either._tag === 'Left' ? exports.EitherM.right(either.left) : exports.EitherM.left(either.right),
    fromNullable: (value) => value != null ? exports.EitherM.right(value) : exports.EitherM.left(null),
    tryCatch: (fn) => {
        try {
            return exports.EitherM.right(fn());
        }
        catch (error) {
            return exports.EitherM.left(error instanceof Error ? error : new Error(String(error)));
        }
    }
};
const compose = (...fns) => (value) => fns.reduceRight((acc, fn) => fn(acc), value);
exports.compose = compose;
const pipe = (value, ...fns) => fns.reduce((acc, fn) => fn(acc), value);
exports.pipe = pipe;
const curry = (fn) => (a) => (b) => fn(a, b);
exports.curry = curry;
const partial = (fn, ...partialArgs) => (...remainingArgs) => fn(...partialArgs.concat(remainingArgs));
exports.partial = partial;
const memoize = (fn, keyFn) => {
    const cache = new Map();
    const getKey = keyFn || ((...args) => JSON.stringify(args));
    return (...args) => {
        const key = getKey(...args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};
exports.memoize = memoize;
exports.AsyncUtils = {
    mapOption: async (asyncOption, fn) => {
        const option = await asyncOption;
        return option._tag === 'Some'
            ? exports.Maybe.some(await fn(option.value))
            : exports.Maybe.none();
    },
    flatMapOption: async (asyncOption, fn) => {
        const option = await asyncOption;
        return option._tag === 'Some' ? fn(option.value) : exports.Maybe.none();
    },
    mapEither: async (asyncEither, fn) => {
        const either = await asyncEither;
        return either._tag === 'Right'
            ? exports.EitherM.right(await fn(either.right))
            : either;
    },
    flatMapEither: async (asyncEither, fn) => {
        const either = await asyncEither;
        return either._tag === 'Right' ? fn(either.right) : either;
    },
    sequenceOptions: async (asyncOptions) => {
        const options = await Promise.all(asyncOptions);
        const values = [];
        for (const option of options) {
            if (option._tag === 'None') {
                return exports.Maybe.none();
            }
            values.push(option.value);
        }
        return exports.Maybe.some(values);
    },
    sequenceEithers: async (asyncEithers) => {
        const eithers = await Promise.all(asyncEithers);
        const values = [];
        for (const either of eithers) {
            if (either._tag === 'Left') {
                return either;
            }
            values.push(either.right);
        }
        return exports.EitherM.right(values);
    },
    mapWithConcurrency: async (items, fn, concurrency = 10) => {
        const results = [];
        const inProgress = [];
        for (let i = 0; i < items.length; i++) {
            const promise = fn(items[i]).then(result => {
                results[i] = result;
            });
            inProgress.push(promise);
            if (inProgress.length >= concurrency) {
                await Promise.race(inProgress);
                inProgress.splice(inProgress.findIndex(p => p === promise), 1);
            }
        }
        await Promise.all(inProgress);
        return results;
    }
};
const lens = (getter, setter) => ({
    get: getter,
    set: setter,
    modify: (f) => (s) => setter(f(getter(s)))(s)
});
exports.lens = lens;
const composeLens = (lens1, lens2) => ({
    get: (s) => lens2.get(lens1.get(s)),
    set: (b) => (s) => lens1.modify(lens2.set(b))(s),
    modify: (f) => (s) => lens1.modify(lens2.modify(f))(s)
});
exports.composeLens = composeLens;
exports.Parsers = {
    char: (expected) => (input) => input.length > 0 && input[0] === expected
        ? exports.EitherM.right([expected, input.slice(1)])
        : exports.EitherM.left(`Expected '${expected}', got '${input[0] || 'EOF'}'`),
    string: (expected) => (input) => input.startsWith(expected)
        ? exports.EitherM.right([expected, input.slice(expected.length)])
        : exports.EitherM.left(`Expected '${expected}', got '${input.slice(0, expected.length)}'`),
    map: (parser, fn) => (input) => exports.EitherM.flatMap(parser(input), ([value, rest]) => exports.EitherM.right([fn(value), rest])),
    sequence: (p1, p2) => (input) => exports.EitherM.flatMap(p1(input), ([v1, rest1]) => exports.EitherM.flatMap(p2(rest1), ([v2, rest2]) => exports.EitherM.right([[v1, v2], rest2]))),
    alt: (p1, p2) => (input) => {
        const result1 = p1(input);
        return result1._tag === 'Right' ? result1 : p2(input);
    },
    many: (parser) => (input) => {
        const results = [];
        let current = input;
        while (true) {
            const result = parser(current);
            if (result._tag === 'Left') {
                break;
            }
            results.push(result.right[0]);
            current = result.right[1];
        }
        return exports.EitherM.right([results, current]);
    }
};
exports.StateM = {
    of: (value) => (state) => [value, state],
    map: (state, fn) => (s) => {
        const [value, newState] = state(s);
        return [fn(value), newState];
    },
    flatMap: (state, fn) => (s) => {
        const [value, newState] = state(s);
        return fn(value)(newState);
    },
    get: () => (state) => [state, state],
    put: (newState) => () => [undefined, newState],
    modify: (fn) => exports.StateM.flatMap(exports.StateM.get(), (state) => exports.StateM.put(fn(state))),
    run: (state, initialState) => state(initialState),
    eval: (state, initialState) => state(initialState)[0],
    exec: (state, initialState) => state(initialState)[1]
};
exports.FreeM = {
    pure: (value) => ({ _tag: 'Pure', value }),
    liftF: (effect) => ({
        _tag: 'Impure',
        effect,
        cont: (x) => exports.FreeM.pure(x)
    }),
    map: (free, fn) => free._tag === 'Pure'
        ? exports.FreeM.pure(fn(free.value))
        : { _tag: 'Impure', effect: free.effect, cont: (x) => exports.FreeM.map(free.cont(x), fn) },
    flatMap: (free, fn) => free._tag === 'Pure'
        ? fn(free.value)
        : { _tag: 'Impure', effect: free.effect, cont: (x) => exports.FreeM.flatMap(free.cont(x), fn) }
};
//# sourceMappingURL=utils.js.map