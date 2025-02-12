import 'reflect-metadata';
import {inject, injectable} from 'inversify';

import * as fs from 'fs-extra';
import * as http from 'http';
import * as path from 'path';
import * as url from 'url';

import {Mock} from '../../../mock/mock';
import {MockResponse} from '../../../mock/mock.response';
import {State} from '../../../state/state';
import {Handler} from '../handler';
import {HttpHeaders, HttpStatusCode} from '../../http';

/**  Handler for a mock request. */
@injectable()
export class MockRequestHandler implements Handler {
    /**
     * Constructor.
     * @param {State} state The state.
     */
    constructor(@inject('State') private state: State) {
    }

    /** {@inheritDoc}.*/
    handle(request: http.IncomingMessage, response: http.ServerResponse, next: Function, params: { id: string, mock: Mock }): void {
        const _response: MockResponse = this.state.getResponse(params.mock.name, params.id);
        if (_response !== undefined) {
            const status: number = _response.status;
            const delay: number = this.state.getDelay(params.mock.name, params.id);
            const jsonCallbackName = this.getJsonCallbackName(request);

            let headers = _response.headers;
            let chunk: Buffer | string;
            try {
                if (this.isBinaryResponse(_response)) {
                    chunk = fs.readFileSync(path.join(params.mock.path, _response.file));
                } else {
                    const _variables: any = this.state.getVariables(params.id);
                    chunk = this.interpolateResponseData(_response.data, _variables);
                }

                if (jsonCallbackName !== false) {
                    chunk = jsonCallbackName + '(' + chunk + ')';
                }

                setTimeout(() => {
                    response.writeHead(status, headers);
                    response.end(chunk);
                }, delay);
            } catch (e) {
                response.writeHead(HttpStatusCode.INTERNAL_SERVER_ERROR, HttpHeaders.CONTENT_TYPE_APPLICATION_JSON);
                response.end(JSON.stringify(e, ['message']));
            }
        } else {
            next();
        }
    }

    /**
     * Indicates if the given response is a binary response.
     * @param response The response
     * @return {boolean} indicator The indicator.
     */
    isBinaryResponse(response: MockResponse): boolean {
        return response.file !== undefined;
    }

    /**
     * Update the response data with the globally available variables.
     * @param data The data.
     * @param variables The variables.
     * @return updatedData The updated data.
     */
    interpolateResponseData(data: any, variables: { [key: string]: string }): string {
        let _data: string;

        _data = JSON.stringify(data);
        Object.keys(variables).forEach((key) => {
            if (variables.hasOwnProperty(key)) {
                _data = _data.replace(new RegExp(`%%${key}%%`, 'g'), variables[key]);
            }
        });
        return _data;
    }

    /**
     * Get the JSONP callback name.
     * @param request The request.
     * @returns {string|boolean} callbackName Either the name or false.
     */
    getJsonCallbackName(request: http.IncomingMessage): string | boolean {
        const parsedUrl: any = url.parse(request.url, true);
        return !parsedUrl.query || !parsedUrl.query.callback ? false : parsedUrl.query.callback;
    }
}
