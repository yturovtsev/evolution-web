import {createReducer} from '~/shared/utils';
import {Map} from 'immutable';
import {RoomModel} from '~/shared/models/RoomModel';

export const reducer = createReducer(Map(), {
  roomCreateSuccess: (state, data) => state.set(data.room.id, data.room)
  , roomJoinSuccess: (state, data) => state.update(data.roomId, room => room.update('users', users => users.push(data.userId)))
});