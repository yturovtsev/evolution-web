import {GameModel} from '../models/game/GameModel';
import * as cardTypes from '../models/game/evolution/cards';
import {CardModel} from '../models/game/CardModel';
import {AnimalModel} from '../models/game/evolution/AnimalModel';
//import {PlayerModel} from '../models/game/PlayerModel';
//
import {
  roomCreateRequest,
  roomJoinRequest,
  gameCreateRequest,
  gameCreateSuccess,
  gameReadyRequest,
  gameDeployAnimalRequest,
  gameDeployTraitRequest,
} from '../actions/actions';

const expectUnchanged = (cb, ...stores) => {
  let previousStates = stores.map(store => store.getState());
  cb();
  stores.forEach((store, i) => {
    expect(store.getState().toJS()).eql(previousStates[i].toJS());
  });
};
const expectChanged = (cb, ...stores) => {
  let previousStates = stores.map(store => store.getState());
  cb();
  stores.forEach((store, i) => {
    expect(store.getState()).not.equal(previousStates[i]);
  });
};

describe('Hacking Game:', function () {
  //it('Game for two', () => {

  // Wrong gameCreateRequest:
  //previousServerState = serverStore.getState();
  //previousClientState = clientStore0.getState();
  //clientStore0.dispatch(gameCreateRequest(null));
  //expect(previousServerState).equal(serverStore.getState());
  //expect(previousClientState).equal(clientStore0.getState());
  //
  //})
  it('gameReadyRequest', () => {
    const [serverStore, {clientStore0, User0}, {clientStore1, User1}, {clientStore2, User2}] = mockStores(3);
    clientStore0.dispatch(roomCreateRequest());
    const roomId = serverStore.getState().get('rooms').first().id;
    clientStore0.dispatch(roomJoinRequest(roomId));
    clientStore1.dispatch(roomJoinRequest(roomId));
    clientStore0.dispatch(gameCreateRequest(roomId));
    const ServerGame = () => serverStore.getState().get('games').first();
    const ClientGame0 = () => clientStore0.getState().get('game');
    const ClientGame1 = () => clientStore1.getState().get('game');
    clientStore2.dispatch(gameCreateSuccess(ServerGame()));

    // gameReadyRequest, wrong gameId
    expectUnchanged(() => clientStore0.dispatch({
      type: 'gameReadyRequest'
      , data: {gameId: null}
      , meta: {server: true}
    }), serverStore, clientStore0);

    // gameReadyRequest, wrong user
    expectUnchanged(() => clientStore2.dispatch(gameReadyRequest())
      , serverStore, clientStore2);

    // gameReadyRequest, double user
    clientStore0.dispatch(gameReadyRequest());
    expectUnchanged(() => clientStore0.dispatch(gameReadyRequest())
      , serverStore, clientStore0);

    // gameReadyRequest, double
    clientStore1.dispatch(gameReadyRequest());
    expectUnchanged(() => clientStore1.dispatch(gameReadyRequest())
      , serverStore, clientStore1);
  });

  it('gameDeployAnimalRequest', () => {
    const [{serverStore, ServerGame, CreateGame}, {clientStore0, User0, ClientGame0}, {clientStore1, User1, ClientGame1}] = mockGame(2);
    CreateGame({
      players: {
        [User0.id]: {hand: GameModel.generateDeck([[6, cardTypes.CardCamouflage]])}
        , [User1.id]: {hand: GameModel.generateDeck([[6, cardTypes.CardCamouflage]])}
      }
    });

    // gameDeployAnimalRequest empty
    expectUnchanged(() => clientStore0.dispatch(gameDeployAnimalRequest())
      , serverStore, clientStore0);

    // gameDeployAnimalRequest (0:0:0) User1 not in turn
    expectUnchanged(() => clientStore1.dispatch(gameDeployAnimalRequest(ClientGame1().getPlayerCard(User1, 0).id, 0)), serverStore, clientStore1);
    // gameDeployAnimalRequest (0:0:0) User0 turn, wrong ID
    expectUnchanged(() => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, null)), serverStore, clientStore0);
    // gameDeployAnimalRequest (0:0:0) User0 turn, wrong ID
    expectUnchanged(() => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, -2)), serverStore, clientStore0);

    // gameDeployAnimalRequest (0:0:0) User0 turn
    expectChanged(() => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, 0)), serverStore, clientStore0);
    expect(ServerGame().status.player, 'ServerGame().status.player').equal(1);

    // gameDeployAnimalRequest (0:0:1) User0 second try
    expectUnchanged(() => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, 0))
      , serverStore, clientStore0);

    // gameDeployAnimalRequest (0:0:1) User1 turn
    expectChanged(() => clientStore1.dispatch(gameDeployAnimalRequest(ClientGame1().getPlayerCard(User1, 1).id, 0)), serverStore, clientStore1);
    expect(ServerGame().status.round, 'ServerGame().status.player').equal(1);
    expect(ServerGame().status.player, 'ServerGame().status.player').equal(0);

    // gameDeployAnimalRequest (0:1:0) User1 second try
    expectUnchanged(() => clientStore1.dispatch(gameDeployAnimalRequest(ClientGame1().getPlayerCard(User1, 0).id, 0))
      , serverStore, clientStore1);
  });

  it('gameDeployTraitRequest', () => {
    const [{serverStore, ServerGame, CreateGame}, {clientStore0, User0, ClientGame0}, {clientStore1, User1, ClientGame1}] = mockGame(2);
    CreateGame({
      players: {
        [User0.id]: {
          hand: GameModel.generateDeck([[6, cardTypes.CardCamouflage]])
          , continent: [AnimalModel.new(CardModel.new(cardTypes.CardCamouflage))]
        }
        , [User1.id]: {
          hand: GameModel.generateDeck([[6, cardTypes.CardCamouflage]])
          , continent: [AnimalModel.new(CardModel.new(cardTypes.CardCamouflage))]
        }
      }
    });

    // gameDeployTraitRequest empty
    expectUnchanged(() => clientStore0.dispatch(gameDeployTraitRequest())
      , serverStore, clientStore0);

    // gameDeployTraitRequest invalid card
    expectUnchanged(() => clientStore0.dispatch(gameDeployTraitRequest(
      '123'
      , ClientGame0().getPlayerAnimal(null, 0).id))
      , serverStore, clientStore0);

    // gameDeployTraitRequest invalid animal
    expectUnchanged(() => clientStore0.dispatch(gameDeployTraitRequest(
      ClientGame0().getPlayerCard(null, 0).id
      , '123'))
      , serverStore, clientStore0);

    // gameDeployTraitRequest valid card, valid animal
    expectChanged(() => clientStore0.dispatch(gameDeployTraitRequest(
      ClientGame0().getPlayerCard(null, 0).id
      , ClientGame0().getPlayerAnimal(null, 0).id))
      , serverStore, clientStore0);

    // wait turn
    clientStore1.dispatch(gameDeployTraitRequest(ClientGame1().getPlayerCard(null, 0).id, ClientGame1().getPlayerAnimal(null, 0).id));

    // gameDeployTraitRequest already has trait, valid animal
    expectUnchanged(() => clientStore0.dispatch(gameDeployTraitRequest(
      ClientGame0().getPlayerCard(null, 0).id
      , ClientGame0().getPlayerAnimal(null, 0).id))
      , serverStore, clientStore0);
  });
});
















