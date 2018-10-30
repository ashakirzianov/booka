import { createStore, compose, applyMiddleware } from "redux";
import { install as installReduxLoop } from 'redux-loop';
// import { logger } from "redux-logger";
import { throttle } from "lodash";
import { reducer } from "./reducers";
import { State, storeState, restoreState } from "./storage";
import promiseMiddleware from 'redux-promise-middleware';
import { createBrowserHistory, Location, Action } from "history";
import { BookLocator, staticBookLocator } from "../model/bookLocator";
import { loadBL } from "./api";

// TODO: hide this preparations behind some interface?

const enhancer = compose(
    applyMiddleware(
        promiseMiddleware(), // TODO: consider removing promise support?
    ),
    installReduxLoop(),
) as any; // TODO: find out what are expected types

function validateState(restored: State | undefined) {
    return undefined;
}

function createNewState(): State {
    return {
        book: { book: 'no-book' },
    };
}

const initial: State = validateState(restoreState()) || createNewState();
export const store = createStore(reducer, initial, enhancer);

store.subscribe(throttle(() => {
    storeState(store.getState());
}, 1000));

export const history = createBrowserHistory();

export function dispatchHistoryEvent(location: Location, action?: Action) {
    dispatchLoadBLAction(staticBookLocator(location.pathname));
}

export function dispatchLoadBLAction(bl: BookLocator) {
    store.dispatch({
        type: 'setBook',
        payload: loadBL(bl),
    });
}
