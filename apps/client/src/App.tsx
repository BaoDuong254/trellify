import Button from "@mui/material/Button";
import ThreeDRotation from "@mui/icons-material/ThreeDRotation";
import AccessAlarmIcon from "@mui/icons-material/AccessAlarm";
import Typography from "@mui/material/Typography";

export default function ButtonUsage() {
  return (
    <>
      <Typography variant='body2' color='textSecondary'>
        MUI Button with Icons Example
      </Typography>
      <Button variant='contained' color='success'>
        Hello world
      </Button>
      <AccessAlarmIcon />
      <ThreeDRotation />
    </>
  );
}
