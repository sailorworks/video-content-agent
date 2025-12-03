import inquirer from "inquirer";

export async function runHumanReviewNode(
  script: string | undefined
): Promise<{ approved: boolean; feedback?: string | undefined }> {
  console.log("\n--- 🕵️ HUMAN REVIEW STARTED ---");

  if (!script || script.startsWith("Error:")) {
    console.error("❌ No valid script was generated.");
    return { approved: false, feedback: "Script generation failed." };
  }

  console.log("\n--------------------------------");
  console.log(script);
  console.log("--------------------------------\n");

  // FIX: Use 'confirm' type instead of 'list'.
  // This works even if arrow keys don't work.
  // You just type 'y' for Yes or 'n' for No.
  const { isApproved } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isApproved",
      message: "Is this script good enough?",
      default: false, // Default is No if you just hit enter
    },
  ]);

  if (isApproved) {
    // User typed 'y' or 'yes'
    return { approved: true, feedback: undefined };
  } else {
    // User typed 'n' or 'no'
    const { feedback } = await inquirer.prompt([
      {
        type: "input",
        name: "feedback",
        message: "What should be changed?",
        default: "Make the hook punchier",
      },
    ]);
    return { approved: false, feedback: feedback as string };
  }
}
