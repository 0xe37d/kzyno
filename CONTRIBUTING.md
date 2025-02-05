# Contributing to kzyno

First off, thank you for considering contributing to kzyno! It's people like you that make kzyno a revolutionary platform for decentralized gambling.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Be respectful and inclusive
- No harassment, trolling, or discriminatory behavior
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include screenshots if possible

### Suggesting Enhancements

If you have a suggestion for the project, we'd love to hear it. Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Specific examples of how this enhancement would be useful
- If possible, mock-ups or examples of similar features in other projects

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Process

### Setting Up Your Environment

1. Install Solana CLI tools

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
```

2. Install Anchor Framework

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

3. Clone the repository

```bash
git clone https://github.com/0xe37d/kzyno.git
cd kzyno
```

4. Install dependencies

```bash
npm install
cd frontend
npm install
```

### Directory Structure

```
kzyno/
├── frontend/           # Next.js frontend application
│   ├── src/           # Source code
│   ├── public/        # Static files
│   └── ...
├── programs/          # Solana programs
│   └── kzyno-token/   # Token program
└── tests/             # Program tests
```

### Coding Style

- **Rust**: Follow the official Rust style guide
- **TypeScript**: Use Prettier with default configuration
- **CSS**: Follow TailwindCSS conventions
- **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

### Testing

- Write unit tests for all new features
- Ensure all tests pass before submitting PR
- Include integration tests where appropriate
- Test on Solana devnet before submitting

## Documentation

- Keep README.md updated
- Document all new features
- Update API documentation
- Include comments in complex code sections

## Community

- Join our [Discord](https://discord.gg/kzyno)
- Follow us on [Twitter](https://twitter.com/kzyno)
- Participate in governance discussions

## Questions?

If you have any questions, please feel free to contact the maintainers or create a discussion on GitHub.

---

Remember: The best way to contribute is to be respectful, clear, and helpful. Thank you for helping make kzyno better!
