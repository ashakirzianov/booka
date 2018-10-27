import { buildPartialReducer } from "./redux-utils";
import { ActionsTemplate } from "../model/actions";
import { combineReducers } from "./react-redux-utils";
import { App } from "../model/app";
import { loadStaticEpub } from '../loader/epubLoad';
import { Book, createLoadingStub, createNoBook } from "../model/book";
import { BookLocator } from "../model/bookLocator";
// import { url } from "../samples/warAndPeace";

export function testLoader(): Promise<Book> {
    return loadStaticEpub('wap.epub');
}

export function loadBL(bookLocator: BookLocator): Promise<Book> {
    switch (bookLocator.bl) {
        case 'no-book':
            return Promise.resolve(createNoBook());
        case 'static-book':
            return loadStaticEpub(bookLocator.name + '.epub');
        default:
            return Promise.resolve(createNoBook());
    }
}

const book = buildPartialReducer<App['book'], ActionsTemplate>({
    loadDefaultBook: {
        loop: {
            sync: (s, p) => createLoadingStub(),
            async: testLoader,
            success: 'setBook',
            fail: 'bookLoadFail',
        },
    },
    loadBL: {
        loop: {
            sync: (s, p) => createLoadingStub(),
            async: testLoader,
            success: 'setBook',
            fail: 'bookLoadFail',
        },
    },
    setBook: (s, p) => {
        return p;
    },
});

const currentBL = buildPartialReducer<App['currentBL'], ActionsTemplate>({
    loadBL: (s, p) => p,
});

export const reducer = combineReducers<App, ActionsTemplate>({
    book,
    currentBL,
});
