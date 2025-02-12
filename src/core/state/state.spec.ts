import 'reflect-metadata';
import {Container} from 'inversify';

import {stub} from 'sinon';

import {State} from './state';
import {SessionState} from './session.state';
import {IState} from './Istate';

describe('State', () => {
    let container: Container;
    let state: State;
    let stateGetMatchingStateFn: sinon.SinonStub;

    beforeAll(() => {
        container = new Container();
        state = new State();
        stateGetMatchingStateFn = stub(State.prototype, <any>'getMatchingState');
        (state as any)._mocks = [];
        state.mocks.push(...[{
            name: 'simple', request: {url: 'some/api', method: 'GET',}, responses: {one: {}, two: {}}
        }, {
            name: 'advanced', request: {
                url: 'some/api', method: 'POST',
                headers: {'Content-Type': '.*/json', 'Cache-Control': 'no-cache'},
                body: {number: '\\d+', identifier: '^[a-zA-Z]{4}$'}
            }, responses: {three: {}, four: {}}
        }]);
    });

    describe('getMatchingState', () => {
        beforeEach(() => {
            state.global.mocks['some'] = {scenario: 'thing', echo: true, delay: 0};
            state.global.variables['some'] = 'some';
            (state as any)._sessions = [];
            stateGetMatchingStateFn.callThrough();
        });

        describe('id === undefined', () =>
            it('returns the global state', () =>
                expect(state.getMatchingState(undefined)).toBe(state.global)));

        describe('no session matching the id', () =>
            it('returns a new SessionState by cloning the GlobalState', () => {
                const matchingState = state.getMatchingState('someId');
                expect(state.sessions.length).toBe(1);

                expect((matchingState as SessionState).identifier).toBe('someId');
                expect(Object.keys(matchingState.mocks).length).toBe(1);
                expect(matchingState.mocks['some']).toEqual({scenario: 'thing', echo: true, delay: 0});
                expect(Object.keys(matchingState.variables).length).toBe(1);
                expect(matchingState.variables['some']).toBe('some');
            })
        );

        describe('session matches the id', () => {
            let sessionState: SessionState;
            beforeEach(() => {
                sessionState = new SessionState('someId', {}, {});
                state.sessions.push(sessionState);
            });
            it('returns the matching SessionState', () => {
                const matchingState = state.getMatchingState('someId');
                expect(state.sessions.length).toBe(1);
                expect(matchingState).toBe(sessionState);
            });
        });

        afterEach(() => {
            stateGetMatchingStateFn.reset();
        });
    });

    describe('getMatchingMock', () => {
        describe('url does not match', () =>
            it('returns undefined', () =>
                expect(state.getMatchingMock('no/match', 'P2OST', {
                    'content-type': 'application/json',
                    'cache-control': 'no-cache'
                }, {number: 123, identifier: 'abcd'})).toBeUndefined()));

        describe('method does not match', () =>
            it('returns undefined', () =>
                expect(state.getMatchingMock('some/api', 'PUT', {
                    'content-type': 'application/json',
                    'cache-control': 'no-cache'
                }, {number: 123, identifier: 'abcd'})).toBeUndefined()));

        describe('headers does not match', () =>
            it('returns undefined', () =>
                expect(state.getMatchingMock('some/api', 'POST', {
                    'content-type': 'application/json',
                    'cache-control': 'public'
                }, {number: 123, identifier: 'abcd'})).toBeUndefined()));

        describe('body does not match', () =>
            it('returns undefined', () =>
                expect(state.getMatchingMock('some/api', 'POST', {
                    'content-type': 'application/json',
                    'cache-control': 'no-cache'
                }, {number: 123, identifier: 'ab'})).toBeUndefined()));

        describe('request matches', () =>
            it('returns the matching mock', () => {
                // match simple mock - only url and method
                expect(state.getMatchingMock('some/api', 'GET', {}, {})).toEqual({
                    name: 'simple', request: {url: 'some/api', method: 'GET',}, responses: {one: {}, two: {}}
                });
                // match advanced mock - url, method, headers, body
                expect(state.getMatchingMock('some/api', 'POST', {
                    'content-type': 'application/json',
                    'cache-control': 'no-cache'
                }, {number: 123, identifier: 'abcd'})).toEqual({
                    name: 'advanced', request: {
                        url: 'some/api', method: 'POST',
                        headers: {'Content-Type': '.*/json', 'Cache-Control': 'no-cache'},
                        body: {number: '\\d+', identifier: '^[a-zA-Z]{4}$'}
                    }, responses: {three: {}, four: {}}
                });
            }));
    });

    describe('getResponse', () => {
        let matchingState: IState;
        beforeEach(() => {
            matchingState = {
                mocks: {simple: {scenario: 'one', delay: 0, echo: false}},
                variables: {},
                recordings: {},
                record: false
            };
            stateGetMatchingStateFn.returns(matchingState);
        });

        describe('no matching mock', () =>
            it('returns undefined', () =>
                expect(state.getResponse('noMatch', 'id')).toBeUndefined()));

        describe('matching mock', () =>
            it('returns the selected response', () =>
                expect(state.getResponse('simple', 'id')).toEqual({
                    name: 'simple', request: {url: 'some/api', method: 'GET',}, responses: {one: {}, two: {}}
                }.responses['one'])));

        afterEach(() => {
            stateGetMatchingStateFn.reset();
        });
    });

    describe('getDelay', () => {
        let matchingState: IState;
        beforeEach(() => {
            matchingState = {
                mocks: {simple: {scenario: 'one', delay: 1000, echo: false}},
                variables: {},
                recordings: {},
                record: false
            };
            stateGetMatchingStateFn.returns(matchingState);
        });

        describe('no matching mock', () =>
            it('returns 0', () =>
                expect(state.getDelay('noMatch', 'id')).toBe(0)));

        describe('matching mock', () =>
            it('returns the selected delay', () =>
                expect(state.getDelay('simple', 'id')).toBe(1000)));

        afterEach(() => {
            stateGetMatchingStateFn.reset();
        });
    });

    describe('getEcho', () => {
        let matchingState: IState;
        beforeEach(() => {
            matchingState = {
                mocks: {simple: {scenario: 'one', delay: 1000, echo: true}},
                variables: {},
                recordings: {},
                record: false
            };
            stateGetMatchingStateFn.returns(matchingState);
        });

        describe('no matching mock', () =>
            it('returns false', () =>
                expect(state.getEcho('noMatch', 'id')).toBe(false)));

        describe('matching mock', () =>
            it('returns the selected echo', () =>
                expect(state.getEcho('simple', 'id')).toBe(true)));

        afterEach(() => {
            stateGetMatchingStateFn.reset();
        });
    });

    describe('getVariables', () => {
        let matchingState: IState;
        beforeEach(() => {
            matchingState = {
                mocks: {},
                variables: {this: 'this', that: 'that'},
                recordings: {},
                record: false
            };
            stateGetMatchingStateFn.returns(matchingState);
        });

        it('returns the state variables', () => {
            const response = state.getVariables('id');
            expect(response).toBe(matchingState.variables);
        });

        afterEach(() => {
            stateGetMatchingStateFn.reset();
        });
    });

    describe('setToDefaults', () => {
        let matchingState: IState;
        beforeEach(() => {
            matchingState = {
                mocks: {
                    simple: {scenario: 'one', delay: 1000, echo: true},
                    advanced: {scenario: 'three', delay: 3000, echo: false}
                },
                variables: {},
                recordings: {},
                record: false
            };

            state.defaults['simple'] = {scenario: 'two', delay: 2000, echo: false};
            state.defaults['advanced'] = {scenario: 'four', delay: 4000, echo: true};
        });

        it('sets the state to defaults', () => {
            stateGetMatchingStateFn.returns(matchingState);
            let simpleMockState = matchingState.mocks['simple'];
            expect(simpleMockState.scenario).toBe('one');
            expect(simpleMockState.delay).toBeTruthy(1000);
            expect(simpleMockState.echo).toBe(true);

            let advancedMockState = matchingState.mocks['advanced'];
            expect(advancedMockState.scenario).toBe('three');
            expect(advancedMockState.delay).toBeTruthy(3000);
            expect(advancedMockState.echo).toBe(false);

            state.setToDefaults('id');

            simpleMockState = matchingState.mocks['simple'];
            expect(simpleMockState.scenario).toBe('two');
            expect(simpleMockState.delay).toBeTruthy(2000);
            expect(simpleMockState.echo).toBe(false);

            advancedMockState = matchingState.mocks['advanced'];
            expect(advancedMockState.scenario).toBe('four');
            expect(advancedMockState.delay).toBeTruthy(4000);
            expect(advancedMockState.echo).toBe(true);
        });

        afterEach(() => {
            stateGetMatchingStateFn.reset();
        });
    });

    describe('setToPassThroughs', () => {
        let matchingState: IState;
        beforeEach(() => {
            matchingState = {
                mocks: {
                    simple: {scenario: 'one', delay: 1000, echo: true},
                    advanced: {scenario: 'three', delay: 3000, echo: false}
                },
                variables: {},
                recordings: {},
                record: false
            };

            state.defaults['simple'] = {scenario: 'two', delay: 2000, echo: false};
            state.defaults['advanced'] = {scenario: 'four', delay: 4000, echo: true};
        });

        it('sets the state to defaults', () => {
            stateGetMatchingStateFn.returns(matchingState);
            let simpleMockState = matchingState.mocks['simple'];
            expect(simpleMockState.scenario).toBe('one');
            expect(simpleMockState.delay).toBeTruthy(1000);
            expect(simpleMockState.echo).toBe(true);

            let advancedMockState = matchingState.mocks['advanced'];
            expect(advancedMockState.scenario).toBe('three');
            expect(advancedMockState.delay).toBeTruthy(3000);
            expect(advancedMockState.echo).toBe(false);

            state.setToPassThroughs('id');

            simpleMockState = matchingState.mocks['simple'];
            expect(simpleMockState.scenario).toBe('passThrough');
            expect(simpleMockState.delay).toBeTruthy(1000);
            expect(simpleMockState.echo).toBe(true);

            advancedMockState = matchingState.mocks['advanced'];
            expect(advancedMockState.scenario).toBe('passThrough');
            expect(advancedMockState.delay).toBeTruthy(3000);
            expect(advancedMockState.echo).toBe(false);
        });

        afterEach(() => {
            stateGetMatchingStateFn.reset();
        });
    });
});
