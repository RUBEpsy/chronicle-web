/*
 * @flow
 */

import { call, put, takeEvery } from '@redux-saga/core/effects';
import { Models } from 'lattice';
import { DataApiActions, DataApiSagas } from 'lattice-sagas';
import type { SequenceAction } from 'redux-reqseq';

import { SUBMIT_DATA_GRAPH, submitDataGraph } from './DataActions';

import Logger from '../../../utils/Logger';
import { ERR_ACTION_VALUE_NOT_DEFINED, ERR_WORKER_SAGA } from '../../../utils/Errors';

const LOG = new Logger('DataSagas');
const { DataGraphBuilder } = Models;
const {
  createEntityAndAssociationDataWorker
} = DataApiSagas;
const {
  createEntityAndAssociationData
} = DataApiActions;


/*
 *
 * DataActions.submitDataGraph()
 *
 */

function* submitDataGraphWorker(action :SequenceAction) :Generator<*, *, *> {
  const workerResponse :Object = {};
  const { id, value } = action;
  if (value === null || value === undefined) {
    workerResponse.error = ERR_ACTION_VALUE_NOT_DEFINED;
    yield put(submitDataGraph.failure(id, workerResponse.error));
    return workerResponse;
  }
  try {
    yield put(submitDataGraph.request(id, value));

    const dataGraph = (new DataGraphBuilder())
      .setAssociations(value.assocationEntityData)
      .setEntities(value.entityData)
      .build();

    const response = yield call(createEntityAndAssociationDataWorker, createEntityAndAssociationData(dataGraph));
    if (response.error) throw response.error;

    workerResponse.data = response.data;
    yield put(submitDataGraph.success(id, response.data));

  }
  catch (error) {
    workerResponse.error = error;
    LOG.error(ERR_WORKER_SAGA, error);
    yield put(submitDataGraph.failure(id, error));
  }
  finally {
    yield put(submitDataGraph.finally(id));
  }
  return workerResponse;
}
function* submitDataGraphWatcher() :Generator<*, *, *> {
  yield takeEvery(SUBMIT_DATA_GRAPH, submitDataGraphWorker);
}

export {
  submitDataGraphWatcher,
  submitDataGraphWorker
};
