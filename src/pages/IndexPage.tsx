import { useState } from "react";
import { useNavigate, NavLink } from "react-router";
import { PageHeader, OverflowBreadcrumbs } from "@diligentcorp/atlas-react-bundle";
import {
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import EditIcon from "@diligentcorp/atlas-react-bundle/icons/Edit";
import TrashIcon from "@diligentcorp/atlas-react-bundle/icons/Trash";
import QuestionnairesIcon from "@diligentcorp/atlas-react-bundle/icons/Questionnaires";
import ResultsIcon from "@diligentcorp/atlas-react-bundle/icons/Results";

import PageLayout from "../components/PageLayout.js";
import { getQuestionnaires, deleteQuestionnaire } from "../storage.js";
import type { Questionnaire } from "../types.js";

export default function IndexPage() {
  const navigate = useNavigate();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>(getQuestionnaires);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function handleDelete() {
    if (deleteTarget) {
      deleteQuestionnaire(deleteTarget);
      setQuestionnaires(getQuestionnaires());
      setDeleteTarget(null);
    }
  }

  return (
    <PageLayout>
      <PageHeader
        pageTitle="Questionnaires"
        pageSubtitle="Create, manage, and respond to questionnaires"
        breadcrumbs={
          <OverflowBreadcrumbs
            leadingElement={<span>Questionnaire App</span>}
            items={[{ id: "home", label: "Questionnaires", url: "/" }]}
            hideLastItem={true}
            aria-label="Breadcrumbs"
          >
            {({ label, url }) => <NavLink to={url}>{label}</NavLink>}
          </OverflowBreadcrumbs>
        }
      />

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/builder/new")}
        >
          New Questionnaire
        </Button>
      </Stack>

      {questionnaires.length === 0 ? (
        <Stack alignItems="center" justifyContent="center" py={8} gap={2}>
          <Typography variant="h6" color="text.secondary">
            No questionnaires yet
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create your first questionnaire to get started
          </Typography>
        </Stack>
      ) : (
        <Stack gap={2}>
          {questionnaires.map((q) => (
            <Card key={q.id} variant="outlined">
              <CardContent>
                <Typography variant="h6">{q.title}</Typography>
                {q.description && (
                  <Typography variant="body1" color="text.secondary" mt={0.5}>
                    {q.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  {q.questions.length} question{q.questions.length !== 1 ? "s" : ""} · Created{" "}
                  {new Date(q.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions sx={{ gap: 1, px: 2, pb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/builder/${q.id}`)}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<QuestionnairesIcon />}
                  onClick={() => navigate(`/respond/${q.id}`)}
                >
                  Respond
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ResultsIcon />}
                  onClick={() => navigate(`/results/${q.id}`)}
                >
                  Results
                </Button>
                <Button
                  variant="text"
                  size="small"
                  color="destructive"
                  startIcon={<TrashIcon />}
                  onClick={() => setDeleteTarget(q.id)}
                  sx={{ ml: "auto" }}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Questionnaire</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this questionnaire? All associated responses will also
            be deleted. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
