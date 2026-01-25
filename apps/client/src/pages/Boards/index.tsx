import { useState, useEffect } from "react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import ListAltIcon from "@mui/icons-material/ListAlt";
import HomeIcon from "@mui/icons-material/Home";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import { Link, useLocation } from "react-router-dom";
import { styled } from "@mui/material/styles";
import PageLoadingSpinner from "src/components/Loading/PageLoadingSpinner";
import AppBar from "src/components/AppBar/AppBar";
import SidebarCreateBoardModal from "src/pages/Boards/create";
import randomColor from "randomcolor";
import type { Board } from "src/types/board.type";
import { fetchBoardsAPI } from "src/apis";
import { DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE } from "@workspace/shared/utils/constants";

interface FetchBoardsResponse {
  boards: Board[];
  totalBoards: number;
}

const SidebarItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  padding: "12px 16px",
  borderRadius: "8px",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#33485D" : theme.palette.grey[300],
  },
  "&.active": {
    color: theme.palette.mode === "dark" ? "#90caf9" : "#0c66e4",
    backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#e9f2ff",
  },
}));

function Boards() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [totalBoards, setTotalBoards] = useState(0);
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const page = parseInt(query.get("page") || "1", 10);

  const updateStateData = (res: FetchBoardsResponse): void => {
    setBoards(res.boards || []);
    setTotalBoards(res.totalBoards || 0);
  };

  useEffect(() => {
    fetchBoardsAPI(location.search).then(updateStateData);
  }, [location.search]);

  if (!boards) {
    return <PageLoadingSpinner caption='Loading Boards...' />;
  }

  return (
    <Container disableGutters maxWidth={false}>
      <AppBar />
      <Box sx={{ paddingX: 2, my: 4 }}>
        <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
          <Box sx={{ width: { xs: "100%", sm: "25%" } }}>
            <Stack direction='column' spacing={1}>
              <SidebarItem className='active'>
                <SpaceDashboardIcon fontSize='small' />
                Boards
              </SidebarItem>
              <SidebarItem>
                <ListAltIcon fontSize='small' />
                Templates
              </SidebarItem>
              <SidebarItem>
                <HomeIcon fontSize='small' />
                Home
              </SidebarItem>
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Stack direction='column' spacing={1}>
              <SidebarCreateBoardModal />
            </Stack>
          </Box>

          <Box sx={{ width: { xs: "100%", sm: "75%" } }}>
            <Typography variant='h4' sx={{ fontWeight: "bold", mb: 3 }}>
              Your boards:
            </Typography>

            {boards?.length === 0 && (
              <Typography variant='body1' sx={{ fontWeight: "bold", mb: 3 }}>
                No result found!
              </Typography>
            )}

            {boards?.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {boards.map((b) => (
                  <Box key={b._id}>
                    <Card sx={{ width: "250px" }}>
                      <Box sx={{ height: "50px", backgroundColor: randomColor() }}></Box>

                      <CardContent sx={{ p: 1.5, "&:last-child": { p: 1.5 } }}>
                        <Typography gutterBottom variant='h6' component='div'>
                          {b.title}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                        >
                          {b.description || "No description provided for this board."}
                        </Typography>
                        <Box
                          component={Link}
                          to={`/boards/${b._id}`}
                          sx={{
                            mt: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            color: "primary.main",
                            "&:hover": { color: "primary.light" },
                          }}
                        >
                          Go to board <ArrowRightIcon fontSize='small' />
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            )}

            {totalBoards > 0 && (
              <Box sx={{ my: 3, pr: 5, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <Pagination
                  size='large'
                  color='secondary'
                  showFirstButton
                  showLastButton
                  count={Math.ceil(totalBoards / DEFAULT_ITEMS_PER_PAGE)}
                  page={page}
                  renderItem={(item) => (
                    <PaginationItem
                      component={Link}
                      to={`/boards${item.page === DEFAULT_PAGE ? "" : `?page=${item.page}`}`}
                      {...item}
                    />
                  )}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Boards;
