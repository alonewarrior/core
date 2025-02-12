import 'reflect-metadata';
import {Container} from 'inversify';

import * as http from 'http';
import {assert, createStubInstance, SinonStub, SinonStubbedInstance, stub} from 'sinon';

import {State} from '../../../state/state';
import {SetVariableHandler} from './set-variable.handler';
import {IState} from '../../../state/Istate';
import {HttpHeaders, HttpMethods, HttpStatusCode} from '../../http';

describe('SetVariableHandler', () => {
    let container: Container;
    let handler: SetVariableHandler;
    let matchingState: IState;
    let state: SinonStubbedInstance<State>;
    let nextFn: SinonStub;
    let request: SinonStubbedInstance<http.IncomingMessage>;
    let response: SinonStubbedInstance<http.ServerResponse>;

    beforeAll(() => {
        container = new Container();
        state = createStubInstance(State);
        nextFn = stub();
        request = createStubInstance(http.IncomingMessage);
        response = createStubInstance(http.ServerResponse);

        container.bind('BaseUrl').toConstantValue('/base-url');
        container.bind('State').toConstantValue(state);
        container.bind('SetVariableHandler').to(SetVariableHandler);

        handler = container.get<SetVariableHandler>('SetVariableHandler');
    });

    describe('handle', () => {
        beforeEach(() => {
            request.method = HttpMethods.PUT;
            matchingState = {
                mocks: {},
                variables: JSON.parse(JSON.stringify({
                    'one': 'first',
                    'two': 'second',
                    'three': 'third'
                })),
                recordings: {},
                record: false
            };
            state.getMatchingState.returns(matchingState);
        });

        it('sets the variable', () => {
            const body = { 'four': 'fourth' } as any;
            handler.handle(request as any, response as any, nextFn, { id: 'apimockId', body: body });
            assert.calledWith(response.writeHead, HttpStatusCode.OK, HttpHeaders.CONTENT_TYPE_APPLICATION_JSON);
            assert.called(response.end);
            expect(matchingState.variables['four']).toBe('fourth');
        });

        it('sets the variables', () => {
            const body = { 'five': 'fifth', 'six': 'sixth' } as any;
            handler.handle(request as any, response as any, nextFn, { id: 'apimockId', body: body });
            assert.calledWith(response.writeHead, HttpStatusCode.OK, HttpHeaders.CONTENT_TYPE_APPLICATION_JSON);
            assert.called(response.end);
            expect(matchingState.variables['five']).toBe('fifth');
            expect(matchingState.variables['six']).toBe('sixth');
        });

        it('throw error if no key value pair is present', () => {
            const body = {} as any;
            handler.handle(request as any, response as any, nextFn, { id: 'apimockId', body: body });
            assert.calledWith(response.writeHead, HttpStatusCode.CONFLICT, HttpHeaders.CONTENT_TYPE_APPLICATION_JSON);
            assert.calledWith(response.end, `{"message":"A variable should have a key and value"}`);
        });

        afterEach(() => {
            state.getMatchingState.reset();
            response.writeHead.reset();
            response.end.reset();
        });
    });

    describe('isApplicable', () => {
        it('indicates applicable when url and action match', () => {
            request.url = `${'/base-url'}/variables`;
            request.method = HttpMethods.PUT;
            expect(handler.isApplicable(request as any)).toBe(true);
        });
        it('indicates not applicable when the action does not match', () => {
            request.url = `${'/base-url'}/variables`;
            request.method = HttpMethods.GET;
            expect(handler.isApplicable(request as any)).toBe(false);
        });
        it('indicates not applicable when the url does not match', () => {
            request.url = `${'/base-url'}/no-match`;
            request.method = HttpMethods.PUT;
            expect(handler.isApplicable(request as any)).toBe(false);
        });
    });
});