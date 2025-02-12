import 'reflect-metadata';
import {inject, injectable} from 'inversify';

import * as http from 'http';
import {HttpHeaders, HttpStatusCode} from '../../http';

import {State} from '../../../state/state';
import {ApplicableHandler} from '../handler';

/**  Defaults handler. */
@injectable()
export class DefaultsHandler implements ApplicableHandler {
    /**
     * Constructor.
     * @param {State} state The state.
     * @param {string} baseUrl The base url.
     */
    constructor(@inject('State') private state: State,
                @inject('BaseUrl') private baseUrl: string) {
    }

    /** {@inheritDoc}.*/
    handle(request: http.IncomingMessage, response: http.ServerResponse, next: Function, params: { id: string }): void {
        this.state.setToDefaults(params.id);
        response.writeHead(HttpStatusCode.OK, HttpHeaders.CONTENT_TYPE_APPLICATION_JSON);
        response.end();
    }

    /** {@inheritDoc}.*/
    isApplicable(request: http.IncomingMessage, body: any): boolean {
        const urlMatches = request.url.startsWith(`${this.baseUrl}/actions`);
        const actionMatches = body !== undefined && body.action === 'defaults';
        return urlMatches && actionMatches;
    }
}
