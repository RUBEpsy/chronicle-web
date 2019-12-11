/*
 * @flow
 */

import {
  call,
  put,
  select,
  takeEvery
} from '@redux-saga/core/effects';
import { DataApiActions, DataApiSagas } from 'lattice-sagas';
import type { SequenceAction } from 'redux-reqseq';

import {
  CREATE_STUDY,
  GET_STUDIES,
  createStudy,
  getStudies,
} from './StudiesActions';

import Logger from '../../utils/Logger';
import { ENTITY_SET_NAMES } from '../../core/edm/constants/EntitySetNames';

const { CHRONICLE_STUDIES } = ENTITY_SET_NAMES;
const { getEntitySetDataWorker } = DataApiSagas;
const { getEntitySetData } = DataApiActions;
const LOG = new Logger('StudiesSagas');

function* getStudiesWorker(action :SequenceAction) :Generator<*, *, *> {
  try {
    yield put(getStudies.request(action.id));
    const entitySetId = yield select(
      (state) => state.getIn(['edm', 'entitySetIds', CHRONICLE_STUDIES])
    );
    const response = yield call(getEntitySetDataWorker, getEntitySetData({ entitySetId }));

    if (response.error) {
      throw response.error;
    }

    yield put(getStudies.success(action.id, response.data));
  }
  catch (error) {
    LOG.error(action.type, error);
    yield put(getStudies.failure(action.id, error));
  }
  finally {
    yield put(getStudies.finally(action.id));
  }
}

function* getStudiesWatcher() :Generator<*, *, *> {
  yield takeEvery(GET_STUDIES, getStudiesWorker);
}


function* createStudyWorker(action :SequenceAction) :Generator<*, *, *> {
  const { id, value } = action;
  let response :Object = {};

  try {
    yield put(createStudy.request(id, value));
  }
  catch (error) {
    yield put(createStudy.failure(action.id, error));
  }
  finally {
    yield put(createStudy.failure(action.id));
  }
}

function* createStudyWatcher() :Generator<*, *, *> {
  yield takeEvery(CREATE_STUDY, createStudyWorker);
}

export {
  createStudyWatcher,
  createStudyWorker,
  getStudiesWatcher,
  getStudiesWorker,
};
