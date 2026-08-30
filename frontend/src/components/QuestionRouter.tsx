import type { QuestionProps } from "../types";
import SingleQuestion from "./questions/SingleQuestion";
import MultiQuestion from "./questions/MultiQuestion";
import YesNoQuestion from "./questions/YesNoQuestion";
import NumberQuestion from "./questions/NumberQuestion";
import TextQuestion from "./questions/TextQuestion";

// Routes a question to its renderer by `type`. The plan's "table" branch never
// reaches the frontend — the backend expands tables into atomic leaf steps.
export default function QuestionRouter(props: QuestionProps) {
  switch (props.question.type) {
    case "single":
      return <SingleQuestion {...props} />;
    case "multi":
      return <MultiQuestion {...props} />;
    case "yesno":
    case "bool":
      return <YesNoQuestion {...props} />;
    case "number":
      return <NumberQuestion {...props} />;
    case "text":
      return <TextQuestion {...props} />;
    default:
      return <p className="error">Unknown question type: {props.question.type}</p>;
  }
}
