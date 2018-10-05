import { XmlNode, hasChildren, XmlNodeType, isElement, isComment, XmlAttributes, XmlNodeElement } from "./xmlNode";
import { caseInsensitiveEq, isWhitespaces } from "./xmlUtils";
import { letExp } from "../utils";

export type Parser<TIn, TOut> = (input: TIn[]) => Result<TIn, TOut>;
export type XmlParser<TOut = XmlNode> = Parser<XmlNode, TOut>;
export type Success<In, Out> = {
    value: Out,
    next: In[],
    success: true,
};
export type FailReasonSingle = string;
export type FailReasonCompound = { reasons: FailReason[] };
export type FailReasonTagged = { tag: string, reason: FailReason };
export type FailReason = FailReasonSingle | FailReasonCompound | FailReasonTagged;
export type Fail = {
    success: false,
    reason: FailReason,
};
export type Result<In, Out> = Success<In, Out> | Fail;

export function fail(reason: FailReason): Fail {
    return { success: false, reason: reason };
}

export function success<TIn, TOut>(value: TOut, next: TIn[]): Success<TIn, TOut> {
    return { value, next, success: true };
}

export function split<T>(arr: T[]) {
    return {
        head: arr.length > 0 ? arr[0] : undefined,
        tail: arr.length > 1 ? arr.slice(1) : [],
    };
}

export function firstNodeGeneric<TIn = XmlNode>() {
    return <TOut>(f: (n: TIn) => TOut | null) => (input: TIn[]) => {
        const list = split(input);
        if (!list.head) {
            return fail('first node: empty input');
        }
        const result = f(list.head);
        return result === null
            ? fail('first node: func returned null')
            : success(result, list.tail)
            ;
    };
}

export const firstNodeXml = firstNodeGeneric<XmlNode>();

export function ignoreWhitespaces<T>(parser: XmlParser<T>): XmlParser<T> {
    return input => parser(input.filter(node =>
        node.type !== 'text' || !isWhitespaces(node.text)));
}

export const firstNodePredicate = <TIn>(p: (n: TIn) => boolean) => firstNodeGeneric<TIn>()(n => p(n) ? n : null);

export const nodeAny = firstNodeXml(x => x);
export const nodeType = (type: XmlNodeType) => firstNodePredicate<XmlNode>(n => n.type === type);
export const nodeComment = (content: string) => firstNodeXml(n =>
    isComment(n) && n.content === content
        ? n : null
);

function nameCompare(n1: string, n2: string) {
    return caseInsensitiveEq(n1, n2);
}

function attrsCompare(attrs1: XmlAttributes, attrs2: XmlAttributes) {
    return Object.keys(attrs1).every(k =>
        (attrs1[k] === attrs2[k])
        || (!attrs1[k]) // TODO: consider implementing 'negative' comparison
    );
}

export const elementName = (name: string) => firstNodeXml(n =>
    isElement(n) && nameCompare(n.name, name)
        ? n : null
);
export const elementAttributes = (attrs: XmlAttributes) => firstNodeXml(n =>
    isElement(n) && attrsCompare(attrs, n.attributes)
        ? n : null
);
export const elementChildren = <T>(name: string, parser: XmlParser<T>) => translate(
    and(elementName(name), children(parser)),
    results => results[1]
);
export const elementTranslate = <T>(f: (e: XmlNodeElement) => T | null) => firstNodeXml(n =>
    isElement(n) ? f(n) : null
);

export const element = <T = null>(arg: {
    name?: string,
    attrs?: XmlAttributes,
    children?: XmlParser<T>,
}) => and(
    firstNodeXml(n =>
        isElement(n)
            && (!arg.name || caseInsensitiveEq(n.name, arg.name))
            && (!arg.attrs || attrsCompare(arg.attrs, n.attributes))
            ? n : null
    ),
    arg.children ? children(arg.children) : x => success(null as any as T, []),
);

export const textNode = <T>(f: (text: string) => T | null) => firstNodeXml(node =>
    node.type === 'text'
        ? f(node.text)
        : null
);

export function children<T>(parser: XmlParser<T>): XmlParser<T> {
    return input => {
        const list = split(input);
        if (!list.head) {
            return fail('children: empty input');
        }
        if (!hasChildren(list.head)) {
            return fail('children: no children');
        }

        const result = parser(list.head.children);
        if (result.success) {
            return success(result.value, list.tail);
        } else {
            return result;
        }
    };
}

export function parent<T>(parser: XmlParser<T>): XmlParser<T> {
    return input => {
        const list = split(input);
        if (!list.head) {
            return fail('parent: empty input');
        }
        if (!list.head.parent) {
            return fail('parent: no parent');
        }

        const result = parser([list.head.parent]);
        if (result.success) {
            return success(result.value, list.tail);
        } else {
            return result;
        }
    };
}

export function not<T>(parser: Parser<T, any>): Parser<T, T> {
    return input => {
        const list = split(input);
        if (!list.head) {
            return fail('not: empty input');
        }

        const result = parser(input);
        return !result.success
            ? success(list.head, list.tail)
            : fail('not: parser succeed');
    };
}

export function and<TI, T1, T2>(p1: Parser<TI, T1>, p2: Parser<TI, T2>): Parser<TI, [T1, T2]>;
export function and<TI, T1, T2, T3>(p1: Parser<TI, T1>, p2: Parser<TI, T2>, p3: Parser<TI, T3>): Parser<TI, [T1, T2, T3]>;
export function and<TI, T1, T2, T3, T4>(p1: Parser<TI, T1>, p2: Parser<TI, T2>, p3: Parser<TI, T3>, p4: Parser<TI, T4>): Parser<TI, [T1, T2, T3, T4]>;
export function and<T>(...ps: Array<Parser<T, any>>): Parser<T, any[]> {
    return input => {
        const results = [];
        let lastInput = input;
        for (let i = 0; i < ps.length; i++) {
            const result = ps[i](input);
            if (!result.success) {
                return result;
            }
            results.push(result.value);
            lastInput = result.next;
        }

        return success(results, lastInput);
    };
}

export function seq<TI, T1, T2>(p1: Parser<TI, T1>, p2: Parser<TI, T2>): Parser<TI, [T1, T2]>;
export function seq<TI, T1, T2, T3>(p1: Parser<TI, T1>, p2: Parser<TI, T2>, p3: Parser<TI, T3>): Parser<TI, [T1, T2, T3]>;
export function seq<TI, T1, T2, T3, T4>(p1: Parser<TI, T1>, p2: Parser<TI, T2>, p3: Parser<TI, T3>, p4: Parser<TI, T4>): Parser<TI, [T1, T2, T3, T4]>;
export function seq<TI>(...ps: Array<Parser<TI, any>>): Parser<TI, any[]> {
    return input => {
        let currentInput = input;
        const results = [];
        for (let i = 0; i < ps.length; i++) {
            const result = ps[i](currentInput);
            if (!result.success) {
                return result;
            }
            results.push(result.value);
            currentInput = result.next;
        }

        return success(results, currentInput);
    };
}

export function choice<TI, T1, T2>(p1: Parser<TI, T1>, p2: Parser<TI, T2>): Parser<TI, T1 | T2>;
export function choice<TI, T1, T2, T3>(p1: Parser<TI, T1>, p2: Parser<TI, T2>, p3: Parser<TI, T3>): Parser<TI, T1 | T2 | T3>;
export function choice<TI, T1, T2, T3, T4>(
    p1: Parser<TI, T1>, p2: Parser<TI, T2>, p3: Parser<TI, T3>, p4: Parser<TI, T4>
): Parser<TI, T1 | T2 | T3 | T4>;
export function choice<TI>(...ps: Array<Parser<TI, any>>): Parser<TI, any[]> {
    return input => {
        const failReasons = [];
        for (let i = 0; i < ps.length; i++) {
            const result = ps[i](input);
            if (result.success) {
                return result;
            }
            failReasons.push(result.reason);
        }

        return fail({ reasons: failReasons });
    };
}

export function projectLast<TI, T1, T2>(parser: Parser<TI, [T1, T2]>): Parser<TI, T2>;
export function projectLast<TI, T1, T2, T3>(parser: Parser<TI, [T1, T2, T3]>): Parser<TI, T3>;
export function projectLast<TI>(parser: Parser<TI, any>): Parser<TI, any> {
    return translate(parser, result => result[result.length - 1] as any);
}

export function some<TI, T>(parser: Parser<TI, T>): Parser<TI, T[]> {
    return input => {
        const results: T[] = [];
        let currentInput = input;
        let currentResult: Result<TI, T>;
        do {
            currentResult = parser(currentInput);
            if (currentResult.success) {
                results.push(currentResult.value);
                currentInput = currentResult.next;
            }
        } while (currentResult.success);

        return success(results, currentInput);
    };
}

// TODO: implement proper reason reporting
export function oneOrMore<TI, T>(parser: Parser<TI, T>): Parser<TI, T[]> {
    return translate(some(parser), nodes => nodes.length > 0 ? nodes : null);
}

export function translate<TI, From, To>(parser: Parser<TI, From>, f: (from: From) => To | null): Parser<TI, To> {
    return input => {
        const from = parser(input);
        return from.success
            ? letExp(f(from.value), val =>
                val === null
                ? fail('translate: result rejected by transform function')
                : success(val, from.next))
            : from
            ;
    };
}

export function report<TIn, TOut>(tag: string, parser: Parser<TIn, TOut>): Parser<TIn, TOut> {
    return (input: TIn[]) => {
        const result = parser(input);
        return result.success ? result : fail({
            tag: tag,
            reason: result.reason,
        });
    };
}

export function between<T>(left: XmlParser<any>, right: XmlParser<any>, inside: XmlParser<T>): XmlParser<T> {
    return input => {
        const result = seq(
            some(not(left)),
            left,
            some(not(right)),
            right,
        )(input);

        return result.success
            ? inside(result.value[2])
            : result
            ;
    };
}

export function skipToNode<T>(node: XmlParser<T>): XmlParser<T> {
    return projectLast(seq(
        some(not(node)),
        node,
    ));
}

// TODO: handle empty path scenario
function parsePathHelper<T>(paths: string[], then: XmlParser<T>, input: XmlNode[]): Result<XmlNode, T> {
    const path = paths[0];

    const childIndex = input.findIndex(ch =>
        ch.type === 'element' && nameCompare(ch.name, path));
    const child = input[childIndex];
    if (!child) {
        return fail(`parse path: ${path}: can't find child`);
    }

    if (paths.length < 2) {
        return report('parse path: then', then)(input.slice(childIndex));
    }

    const nextInput = hasChildren(child) ? child.children : []; // TODO: rethink

    return parsePathHelper(paths.slice(1), then, nextInput);
}

export function parsePath<T>(paths: string[], then: XmlParser<T>): XmlParser<T> {
    return (input: XmlNode[]) => parsePathHelper(paths, then, input);
}
