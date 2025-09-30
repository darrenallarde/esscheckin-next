import { useParams, useNavigate } from "react-router-dom";
import PublicStudentProfile from "@/components/PublicStudentProfile";

const PublicProfile = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  if (!studentId) {
    navigate('/');
    return null;
  }

  return <PublicStudentProfile studentId={studentId} onBack={() => navigate('/')} />;
};

export default PublicProfile;
