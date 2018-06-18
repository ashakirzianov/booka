import * as React from "react";
import { AnyAction, Reducer as ReducerRedux } from "redux";
import { combineReducers as combineReducersRedux } from 'redux-loop';
import { Dispatch, connect } from "react-redux";
import { mapObject, KeyRestriction } from "../utils";
import { ActionDispatchers, ActionCreators, Reducer, ReducerTemplate, buildPartialReducer } from "./redux-utils";

export type TopComponent<Store, ActionsTemplate> = React.ComponentType<{
    store: Store,
    callbacks: ActionDispatchers<ActionsTemplate>,
}>;

export function connectRedux<Store, ActionsTemplate>(
    Comp: TopComponent<Store, ActionsTemplate>,
    actionCreators: ActionCreators<ActionsTemplate>,
) {
    function mapStateToProps(store: Store) {
        return {
            store: store,
        };
    }

    function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
        function buildCallbacks<T>(creators: ActionCreators<T>): ActionDispatchers<T> {
            return mapObject(creators, (key, value) => (x: any) => dispatch(value(x)));
        }

        return {
            callbacks: buildCallbacks(actionCreators),
        };
    }

    const connector = connect(mapStateToProps, mapDispatchToProps);

    return connector(Comp as any); // TODO: remove cast
}

export type ReducersMap<Store, ActionsTemplate> = {
    [k in keyof Store]: Reducer<Store[k], ActionsTemplate>;
};
export function combineReducers<Store, ActionsTemplate>(map: ReducersMap<Store, ActionsTemplate>): ReducerRedux<Store> {
    // This is workaround for issue in redux: https://github.com/reactjs/redux/issues/2709
    return combineReducersRedux<Store>(map as any) as any;
}

type NoNew<State> = KeyRestriction<State, "new">;
export type CombineReducersObject<Store extends NoNew<Store>, ActionTemplate> = {
    [k in keyof Store]: Partial<ReducerTemplate<Store, ActionTemplate>>;
};

export function combineReducersTemplate<Store extends NoNew<Store>, ActionsTemplate>(
    o: CombineReducersObject<Store, ActionsTemplate>) {
    return combineReducers(mapObject(o, (k, v) => buildPartialReducer(v) as any));
}
