import { XmlNode } from "./xmlNode";
import { split } from "./parserCombinators";
import { throwExp } from "../utils";

// ---- TypeDefs

export type Input = XmlNode;

export type NodeFunc<T> = {
    pattern: 'node',
    fn: (node: Input) => T | null,
};

export type Capture<Name extends string, T extends Pattern> = {
    pattern: 'capture',
    name: Name,
    inside: T,
};

export type Sequence<L extends Pattern, R extends Pattern> = {
    pattern: 'sequence',
    first: L,
    second: R,
};

type ValuePattern<T> = NodeFunc<T>;
export type Pattern = ValuePattern<any> | Capture<any, any> | Sequence<any, any>;

export type Match<T extends Pattern> = Unwrap<DoMatch<T>>;
type SecretField = '@@secret_type_helper';
type Wrap<T> = { [k in SecretField]: T };
type Unwrap<T> = T extends Wrap<infer U> ? U : T;
type DoMatch<T extends Pattern> =
    T extends Sequence<infer L, infer R> ? { [k in SecretField]: Match<L> & Match<R> }
    : T extends Capture<infer Name, infer Value> ? { [k in Name]: Match<Value> }
    : T extends NodeFunc<infer Fn> ? Fn
    : never
    ;
export type IgnoreValueMatch<T extends Pattern> = T extends ValuePattern<any> ? {} : Match<T>;

export type Success<T> = {
    success: true,
    match: T,
    next: Input[],
};
export type Fail = {
    success: false,
};
export type Result<T> = Success<T> | Fail;

// ---- Constructors

export function success<T>(match: T, next: Input[]): Success<T> {
    return {
        success: true,
        match: match,
        next: next,
    };
}

export function fail(): Fail {
    return {
        success: false,
    };
}

export function nodeFn<T>(fn: (node: Input) => T | null): NodeFunc<T> {
    return {
        pattern: 'node',
        fn: fn,
    };
}

export function capture<N extends string, P extends Pattern>(name: N, inside: P): Capture<N, P> {
    return {
        pattern: 'capture',
        name: name,
        inside: inside,
    };
}

export function sequence
    <T1 extends Pattern, T2 extends Pattern>(
        p1: T1, p2: T2):
    Sequence<T1, T2>;
export function sequence
    <T1 extends Pattern, T2 extends Pattern, T3 extends Pattern>(
        p1: T1, p2: T2, p3: T3):
    Sequence<T1, Sequence<T2, T3>>;
export function sequence
    <T1 extends Pattern, T2 extends Pattern, T3 extends Pattern, T4 extends Pattern>(
        p1: T1, p2: T2, p3: T3, p4: T4):
    Sequence<T1, Sequence<T2, Sequence<T3, T4>>>;
export function sequence(...ps: Pattern[]): Pattern {
    return ps.reduceRight((acc, p) => ({
        pattern: 'sequence',
        first: p,
        second: acc,
    }));
}

// ---- Type predicates

export function isValuePattern(p: Pattern): p is ValuePattern<any> {
    return isNodeFunc(p);
}

export function isNodeFunc(p: Pattern): p is NodeFunc<any> {
    return p.pattern === 'node';
}

export function isCapture(p: Pattern): p is Capture<any, any> {
    return p.pattern === 'capture';
}

export function isSequence(p: Pattern): p is Sequence<any, any> {
    return p.pattern === 'sequence';
}

// ---- Matcher

function matchNode(nodePattern: NodeFunc<any>, input: Input[]) {
    const list = split(input);
    if (!list.head) {
        return fail();
    }

    const result = nodePattern.fn(list.head);
    return result === null ? fail() : success(result, list.tail);
}

function matchCapture(capturePattern: Capture<any, any>, input: Input[]) {
    const result = matchPattern(capturePattern.inside, input);

    return result.success ?
        success({ [capturePattern.name]: result.match }, result.next)
        : result;
}

function matchSequence(sequencePattern: Sequence<any, any>, input: Input[]) {
    const first = matchPatternIgnoreValue(sequencePattern.first, input);
    if (!first.success) {
        return first;
    }

    const second = matchPatternIgnoreValue(sequencePattern.second, first.next);
    if (!second.success) {
        return second;
    }

    return success({
        ...first.match,
        ...second.match,
    }, second.next);
}

function matchPatternIgnoreValue(pattern: Pattern, input: Input[]) {
    const result = matchPattern(pattern, input);
    return result.success ?
        (isValuePattern(pattern) ? success({}, result.next) : result)
        : result;
}

export function matchPattern<T extends Pattern>(pattern: T, input: Input[]): Result<Match<T>> {
    return isNodeFunc(pattern) ? matchNode(pattern, input)
        : isCapture(pattern) ? matchCapture(pattern, input)
            : isSequence(pattern) ? matchSequence(pattern, input)
                : throwExp({ cantHandlePattern: pattern }); // : assertNever(pattern);
}

// ---- Example

export const sequenceE = sequence(
    capture('foo', nodeFn(x => true)),
    sequence(
        sequence(
            nodeFn(x => 42),
            capture('baz', nodeFn(x => undefined)),
            capture('boo', nodeFn(x => 42)),
        ),
        capture('bar', nodeFn(x => 'hello')),
    ),
);

export type Test = Match<typeof sequenceE>;
export const tttt: Test = null as any;
