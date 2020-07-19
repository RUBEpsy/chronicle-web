// @flow

import React, { useEffect, useState } from 'react';

import styled from 'styled-components';
import { faPlus } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Map } from 'immutable';
import { Constants } from 'lattice';
import {
  Card,
  CardSegment,
  Select,
  Button,
  Spinner,
} from 'lattice-ui-kit';
import { ReduxConstants } from 'lattice-utils';
import { useDispatch, useSelector } from 'react-redux';
import { RequestStates } from 'redux-reqseq';
import type { RequestState } from 'redux-reqseq';

import CreateQuestionnaireForm from './components/CreateQuestionnaireForm';
import QuestionnairesList from './QuestionnairesList';
import { STATUS_SELECT_OPTIONS } from './constants/constants';

import { PROPERTY_TYPE_FQNS } from '../../core/edm/constants/FullyQualifiedNames';
import { QUESTIONNAIRE_REDUX_CONSTANTS } from '../../utils/constants/ReduxConstants';
import { GET_STUDY_QUESTIONNAIRES, getStudyQuestionnaires } from '../questionnaire/QuestionnaireActions';

const { OPENLATTICE_ID_FQN } = Constants;
const { REQUEST_STATE } = ReduxConstants;
const { STUDY_QUESTIONNAIRES } = QUESTIONNAIRE_REDUX_CONSTANTS;
const { ACTIVE_FQN } = PROPERTY_TYPE_FQNS;

const [ACTIVE, NOT_ACTIVE] = STATUS_SELECT_OPTIONS.map((status) => status.value);

const getActiveStatus = (entity :Map) => {
  const active = entity.getIn([ACTIVE_FQN, 0], false);
  return active ? ACTIVE : NOT_ACTIVE;
};

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const SelectWrapper = styled.div`
  min-width: 200px;
`;

type Props = {
  study :Map;
};

const QuestionnairesContainer = ({ study } :Props) => {

  const dispatch = useDispatch();
  // state
  const [selectedStatus, setSelectedStatus] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [filteredListData, setFilteredListData] = useState(Map());

  const studyEKID = study.getIn([OPENLATTICE_ID_FQN, 0]);

  // selectors
  const studyQuestionnaires = useSelector(
    (state) => state.getIn(['questionnaire', STUDY_QUESTIONNAIRES, studyEKID], Map())
  );

  const getStudyQuestionnairesRS :RequestState = useSelector(
    (state) => state.getIn(['questionnaire', GET_STUDY_QUESTIONNAIRES, REQUEST_STATE])
  );

  // initially display all questionnaires
  useEffect(() => {
    setSelectedStatus(STATUS_SELECT_OPTIONS);
  }, []);

  useEffect(() => {
    if (studyQuestionnaires.isEmpty()) {
      dispatch((getStudyQuestionnaires(studyEKID)));
    }
  }, [studyQuestionnaires, studyEKID, dispatch]);

  useEffect(() => {
    setFilteredListData(studyQuestionnaires);
  }, [studyQuestionnaires]);

  useEffect(() => {
    let filtered = studyQuestionnaires;

    if (selectedStatus) {
      const filters = selectedStatus.map((selected) => selected.value);
      if (filters.length !== 0) {
        filtered = studyQuestionnaires.filter((entity) => filters.includes(getActiveStatus(entity)));
      }
    }

    setFilteredListData(filtered);
  }, [selectedStatus, studyQuestionnaires]);

  const onSelectStatus = (selectedOptions :Object[]) => {
    setSelectedStatus(selectedOptions);
  };

  if (getStudyQuestionnairesRS === RequestStates.PENDING) {
    return <Spinner size="1x" />;
  }

  return (
    <>
      <HeaderRow>
        <SelectWrapper>
          <Select
              isDisabled={isEditing}
              isMulti
              onChange={onSelectStatus}
              options={STATUS_SELECT_OPTIONS}
              placeholder="Filter by status"
              value={selectedStatus} />
        </SelectWrapper>
        <Button
            disabled={isEditing}
            color="primary"
            startIcon={<FontAwesomeIcon icon={faPlus} />}
            onClick={() => setIsEditing(true)}>
          New Questionnaire
        </Button>
      </HeaderRow>
      <Card>
        {
          isEditing ? (
            <CreateQuestionnaireForm
                onClose={() => setIsEditing(false)}
                studyEKID={study.getIn([OPENLATTICE_ID_FQN, 0])} />
          ) : (
            <>
              <CardSegment padding="0px">
                {
                  filteredListData.isEmpty() ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                      No questionnaires found.
                    </div>
                  ) : (
                    <QuestionnairesList
                        questionnaires={filteredListData}
                        studyEKID={study.getIn([OPENLATTICE_ID_FQN, 0])} />
                  )
                }
              </CardSegment>
            </>
          )
        }
      </Card>
    </>
  );
};

export default QuestionnairesContainer;