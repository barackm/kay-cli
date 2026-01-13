import * as p from "@clack/prompts";

export async function promptEmail(placeholder = "your@email.com"): Promise<string> {
  const email = await p.text({
    message: "Email",
    placeholder,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Email is required";
      }
      if (!value.includes("@")) {
        return "Please enter a valid email address";
      }
    },
  });

  if (p.isCancel(email)) {
    p.cancel("Connection cancelled");
    process.exit(0);
  }

  return email.trim();
}

export async function promptPassword(message = "Password"): Promise<string> {
  const password = await p.password({
    message,
    mask: "*",
    validate: (value) => {
      if (!value || value.length === 0) {
        return `${message} is required`;
      }
    },
  });

  if (p.isCancel(password)) {
    p.cancel("Connection cancelled");
    process.exit(0);
  }

  return password;
}


