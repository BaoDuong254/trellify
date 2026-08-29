import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import HomeIcon from "@mui/icons-material/Home";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE } from "@workspace/shared/utils/constants";

import { fetchBoardsAPI } from "src/apis";
import AppBar from "src/components/AppBar/AppBar";
import PageLoadingSpinner from "src/components/Loading/PageLoadingSpinner";
import SidebarCreateBoardModal from "src/pages/Boards/create";
import type { Board } from "src/types/board.type";
import { boardCoverColor } from "src/utils/color";

interface FetchBoardsResponse {
  boards: Board[];
  totalBoards: number;
}

interface LoadedBoards extends FetchBoardsResponse {
  search: string;
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
  const [loaded, setLoaded] = useState<LoadedBoards | null>(null);
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const page = parseInt(query.get("page") || "1", 10);

  const fetchBoards = useCallback((search: string, ignored: () => boolean): void => {
    fetchBoardsAPI(search)
      .then((res: FetchBoardsResponse) => {
        if (ignored()) return;
        setLoaded({ search, boards: res.boards || [], totalBoards: res.totalBoards || 0 });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchBoards(location.search, () => ignore);

    return () => {
      ignore = true;
    };
  }, [location.search, fetchBoards]);

  const afterCreateNewBoard = () => {
    fetchBoards(location.search, () => false);
  };

  if (!loaded) {
    return <PageLoadingSpinner caption='Loading Boards...' />;
  }

  const { boards, totalBoards } = loaded;
  const isLoading = loaded.search !== location.search;
  const skeletonCount = Math.min(
    DEFAULT_ITEMS_PER_PAGE,
    Math.max(totalBoards - (page - DEFAULT_PAGE) * DEFAULT_ITEMS_PER_PAGE, 0)
  );

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
              <SidebarCreateBoardModal afterCreateNewBoard={afterCreateNewBoard} />
            </Stack>
          </Box>

          <Box sx={{ width: { xs: "100%", sm: "75%" } }}>
            <Typography variant='h4' sx={{ fontWeight: "bold", mb: 3 }}>
              Your boards:
            </Typography>

            {isLoading && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {Array.from({ length: skeletonCount }, (_, index) => (
                  <Box key={index}>
                    <Card sx={{ width: "250px" }}>
                      <Skeleton variant='rectangular' height={50} />

                      <CardContent sx={{ p: 1.5, "&:last-child": { p: 1.5 } }}>
                        <Typography gutterBottom variant='h6' component='div'>
                          <Skeleton width='70%' />
                        </Typography>
                        <Typography variant='body2'>
                          <Skeleton width='90%' />
                        </Typography>
                        <Box sx={{ mt: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                          <Skeleton width={110} />
                          <ArrowRightIcon fontSize='small' sx={{ visibility: "hidden" }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            )}

            {!isLoading && boards.length === 0 && (
              <Typography variant='body1' sx={{ fontWeight: "bold", mb: 3 }}>
                No result found!
              </Typography>
            )}

            {!isLoading && boards.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {boards.map((b) => (
                  <Box key={b._id}>
                    <Card sx={{ width: "250px" }}>
                      <Box sx={{ height: "50px", backgroundColor: boardCoverColor(b._id) }}></Box>

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
