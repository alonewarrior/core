import 'reflect-metadata';
import {Container} from 'inversify';

import * as http from 'http';
import {assert, createStubInstance, SinonStub, SinonStubbedInstance, stub} from 'sinon';

import {State} from '../../../state/state';
import {RecordHandler} from './record.handler';
import {HttpHeaders, HttpStatusCode} from '../../http';
import {IState} from '../../../state/Istate';

describe('RecordHandler', () => {
    let container: Container;
    let handler: RecordHandler;
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
        container.bind('RecordHandler').to(RecordHandler);

        handler = container.get<RecordHandler>('RecordHandler');
    });

    describe('handle', () => {
        beforeEach(() => {
            matchingState = {
                mocks: JSON.parse(JSON.stringify({
                    'one': { scenario: 'some', delay: 0, echo: true },
                    'two': { scenario: 'thing', delay: 1000, echo: false }
                })),
                variables: {},
                recordings: {},
                record: false
            };
            state.getMatchingState.returns(matchingState);
        });

        it('sets the recording indicator', () => {
            handler.handle(request as any, response as any, nextFn, { id: 'apimockId', body: { record: true } });

            expect(matchingState.record).toBe(true);
            assert.calledWith(response.writeHead, HttpStatusCode.OK, HttpHeaders.CONTENT_TYPE_APPLICATION_JSON);
            assert.called(response.end);
        });
    });

    describe('isApplicable', () => {
        it('indicates applicable when url and action match', () => {
            request.url = `${'/base-url'}/actions`;
            expect(handler.isApplicable(request as any, { action: 'record' })).toBe(true);
        });
        it('indicates not applicable when the action does not match', () => {
            request.url = `${'/base-url'}/actions`;
            expect(handler.isApplicable(request as any, { action: 'NO-MATCHING-ACTION' })).toBe(false);
        });
        it('indicates not applicable when the url does not match', () => {
            request.url = `${'/base-url'}/no-match`;
            expect(handler.isApplicable(request as any, { action: 'record' })).toBe(false);
        });
    });
});