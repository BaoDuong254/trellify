import { Component, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HomeIcon from "@mui/icons-material/Home";
import { Link } from "react-router-dom";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            bgcolor: "background.default",
            p: 3,
          }}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 120,
              color: "error.main",
              mb: 3,
            }}
          />
          <Typography
            variant='h1'
            sx={{
              fontSize: { xs: "4rem", md: "6rem" },
              fontWeight: 700,
              color: "text.primary",
              mb: 2,
            }}
          >
            500
          </Typography>
          <Typography
            variant='h5'
            sx={{
              color: "text.secondary",
              mb: 1,
              textAlign: "center",
            }}
          >
            Oops! Something went wrong
          </Typography>
          <Typography
            variant='body1'
            sx={{
              color: "text.secondary",
              mb: 4,
              textAlign: "center",
              maxWidth: 500,
            }}
          >
            We're sorry for the inconvenience. An unexpected error has occurred. Please try refreshing the page or go
            back to the home page.
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              component={Link}
              to='/'
              onClick={this.handleGoHome}
              variant='contained'
              color='primary'
              startIcon={<HomeIcon />}
              sx={{
                px: 4,
                py: 1.5,
              }}
            >
              Go to Home
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant='outlined'
              color='primary'
              sx={{
                px: 4,
                py: 1.5,
              }}
            >
              Refresh Page
            </Button>
          </Box>
          {this.state.error && import.meta.env.MODE === "development" && (
            <Box
              sx={{
                mt: 4,
                p: 2,
                bgcolor: "grey.100",
                borderRadius: 1,
                maxWidth: 800,
                overflow: "auto",
              }}
            >
              <Typography variant='caption' sx={{ color: "error.main", fontFamily: "monospace" }}>
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }
    return this.props.children;
  }
}
