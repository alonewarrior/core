import {Recording} from './recording';
import {MockState} from './mock.state';

/** State. */
export interface IState {
    mocks: { [identifier: string]: MockState };
    variables: { [key: string]: string };
    recordings: { [identifier: string]: Recording[] };
    record: boolean;
}
