/*
 * @flow
 */

import { AuthUtils } from 'lattice-auth';

import ENV_URLS from './constants/EnvUrls';
import EnvTypes from './constants/EnvTypes';
import Logger from './Logger';
import ParticipantDataTypes from './constants/ParticipantDataTypes';
import { isNonEmptyString } from './LangUtils';
import { isValidUUID } from './ValidationUtils';
import {
  AUTHENTICATED,
  CHRONICLE,
  CSRF_TOKEN,
  DATA,
  FILE_TYPE,
  PARTICIPANT,
  STUDY,
} from './constants/UrlConstants';
import type { ParticipantDataType } from './constants/ParticipantDataTypes';

const LOG = new Logger('AppApi');
const { LOCAL, PRODUCTION, STAGING } = EnvTypes;
const { PREPROCESSED, APP_USAGE } = ParticipantDataTypes;

const getBaseUrl = () => {
  const { hostname } = window.location;
  if (hostname === 'localhost') {
    return ENV_URLS.get(LOCAL);
  }
  if (window.location.hostname.startsWith(STAGING)) {
    return ENV_URLS.get(STAGING);
  }
  return ENV_URLS.get(PRODUCTION);
};

// @dataType RAW : <baseUrl>/study/participant/data/<studyId>/<participantEntityKeyId>?fileType=csv
// @dataType RAW : <baseUrl>/study/participant/data/<studyId>/<participantEntityKeyId/preprocessed>?fileType=csv

const getParticipantDataUrl = (dataType :ParticipantDataType, participantEntityKeyId :UUID, studyId :UUID) => {
  // validation
  if (!isValidUUID(participantEntityKeyId)) {
    LOG.error('participantEntityKeyId must be a valid UUID', participantEntityKeyId);
    return null;
  }
  if (!isValidUUID(studyId)) {
    LOG.error('studyId must be a valiud UUID', studyId);
    return null;
  }

  const baseUrl = getBaseUrl();
  const csrfToken = AuthUtils.getCSRFToken();
  let dataTypePath;

  switch (dataType) {
    case PREPROCESSED:
      dataTypePath = '/preprocessed';
      break;
    case APP_USAGE:
      dataTypePath = '/usage';
      break;
    default:
      dataTypePath = '';
      break;
  }

  return `${baseUrl}/${CHRONICLE}/${STUDY}/${PARTICIPANT}/${DATA}/`
  + `${studyId}/${participantEntityKeyId}${dataTypePath}`
  + `?${FILE_TYPE}=csv`
  + `&${CSRF_TOKEN}=${csrfToken}`;

};

const getParticipantUserAppsUrl = (participantId :string, studyId :UUID) => {

  if (!isValidUUID(studyId)) {
    LOG.error('studyId must be a valiud UUID', studyId);
    return null;
  }

  if (!isNonEmptyString(participantId)) {
    LOG.error('participant id must be a valid string', participantId);
    return null;
  }

  const baseUrl = getBaseUrl();

  return `${baseUrl}/${CHRONICLE}/${STUDY}/${PARTICIPANT}/${DATA}`
    + `/${studyId}/${participantId}/apps`;
};

const getDeleteParticipantPath = (participantId :string, studyId :UUID) => {
  if (!isValidUUID(studyId)) {
    LOG.error('studyId must be a valiud UUID', studyId);
    return null;
  }

  if (!isNonEmptyString(participantId)) {
    LOG.error('participant id must be a valid string', participantId);
    return null;
  }

  return `${getBaseUrl()}/${CHRONICLE}/${STUDY}/${AUTHENTICATED}/${studyId}/${participantId}`;
};

export {
  getBaseUrl,
  getDeleteParticipantPath,
  getParticipantDataUrl,
  getParticipantUserAppsUrl
};
