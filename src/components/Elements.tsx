import * as React from 'react';
// import * as Atoms from './Atoms';
import { Text, View } from './Atoms';
import { Comp } from './comp-utils';

export const TextBlock: Comp<{ text: string }> = props =>
    <Text>{props.text}</Text>;

export const Column: Comp = props =>
    <View style={{ flexDirection: 'column' }}>{props.children}</View>;

export const ChapterTitle: Comp<{ text: string }> = props =>
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16 }}>{props.text}</Text>
    </View>;

export const PartTitle: Comp<{ text: string }> = props =>
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{props.text}</Text>
    </View>;

export const SubpartTitle: Comp<{ text: string }> = props =>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{props.text}</Text>
    </View>;

export const BookTitle: Comp<{ text: string }> = props =>
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 24 }}>{props.text}</Text>
    </View>;

export {
    Text,
} from './Atoms';
