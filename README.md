# Hosby CLI

<p align="center">
  <img src="https://via.placeholder.com/200x200?text=Hosby" alt="Hosby Logo" width="200" height="200">
</p>

<p align="center">
  <strong>A powerful CLI tool for generating and managing database schemas for front-end, mobile, and desktop projects.</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#commands">Commands</a> •
  <a href="#ai-integration">AI Integration</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#development">Development</a>
</p>

## Overview

Hosby CLI is a sophisticated command-line interface tool designed to streamline the development workflow for modern web, mobile, and desktop applications. It analyzes your project's codebase to automatically generate optimized JSON schemas, create type-safe API clients, and manage your data models efficiently. With powerful AI integration, Hosby CLI intelligently interprets your code structure to create schemas that perfectly match your application's needs.

## Installation

```bash
# Install globally
npm install -g hosby-cli

# Or use with npx
npx hosby-cli

# Check installation
hosby --version
```

## Features

### Core Capabilities

- **Intelligent Schema Generation**: Automatically analyze TypeScript/JavaScript projects to create optimized JSON schemas
- **AI-Powered Analysis**: Leverage advanced AI models (OpenAI or Claude) to interpret complex codebases
- **Cloud Synchronization**: Seamlessly push and pull schemas between local development and Hosby cloud
- **TypeScript Client Generation**: Auto-generate type-safe API clients for your schemas
- **CRUD Service Generation**: Create ready-to-use service modules for your data models

### Technical Excellence

- **Robust Error Handling**: Comprehensive error management with detailed diagnostics
- **Configurable Timeouts**: Prevent hanging operations with customizable network timeouts
- **Automatic Updates**: Version checking system to keep your CLI up-to-date
- **Advanced Logging**: Multi-level logging system with configurable verbosity
- **Schema Validation**: Thorough validation to ensure data integrity

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- TypeScript project (for optimal results)
- Hosby account (for cloud features)

### Quick Start

1. **Install the CLI**
   ```bash
   npm install -g hosby-cli
   ```

2. **Log in to your Hosby account**
   ```bash
   hosby login
   ```

3. **Configure your project**
   ```bash
   hosby config project
   ```

4. **Scan your project to generate a schema**
   ```bash
   hosby scan --ai
   ```

5. **Push your schema to the Hosby cloud**
   ```bash
   hosby push
   ```

## Commands

### Authentication

```bash
hosby login
```
Authenticate with the Hosby platform to access cloud features and synchronization.

### Project Management

```bash
# Scan project and generate schema
hosby scan [path] [--ai] [--timeout <ms>]

# Push local schema to Hosby server
hosby push [--force]

# Pull latest schema from Hosby server
hosby pull
```

### Configuration

```bash
# Configure project settings
hosby config project

# Configure AI provider settings
hosby config ai
```

### Development Tools

```bash
# Generate a CRUD service for a specific table
hosby create-service [tableName]

# AI-specific operations
hosby ai
```

### Global Options

```bash
# Enable debug logging
hosby [command] --debug

# Minimize output (error logs only)
hosby [command] --quiet
```

## AI Integration

Hosby CLI integrates with leading AI providers to deliver intelligent code analysis and schema generation:

### Supported AI Providers

- **OpenAI**: Utilizes GPT models for advanced code understanding
- **Claude AI**: Leverages Anthropic's Claude models for nuanced code analysis

### Configuring AI

```bash
hosby config ai
```

This interactive command allows you to:
- Select your preferred AI provider
- Configure your API key
- Save your preferences for future use

### AI-Powered Schema Generation

When using the `--ai` flag with the scan command, Hosby CLI:

1. Analyzes your project's code structure
2. Identifies data models and business entities
3. Intelligently generates an optimized schema
4. Filters out irrelevant UI components and presentation logic

## Configuration

### Project Configuration

Configure your project settings with:

```bash
hosby config project
```

This will prompt you for:
- Project ID
- Project Name

### Environment Variables

Hosby CLI supports the following environment variables:

- `HOSBY_API_URL`: Custom API endpoint
- `HOSBY_LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Claude AI API key
- `OPENAI_MODEL`: Custom OpenAI model name
- `ANTHROPIC_MODEL`: Custom Claude model name

### Logging Levels

Control output verbosity with:

```bash
# For detailed debugging information
export HOSBY_LOG_LEVEL=debug

# For minimal output
export HOSBY_LOG_LEVEL=error
```

Or use command flags:
```bash
hosby [command] --debug
hosby [command] --quiet
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/hosby/hosby-cli.git
cd hosby-cli

# Install dependencies
npm install

# Build the project
npm run build
```

### Development Guidelines

- **Language**: All user-facing messages must be in English
- **Documentation**: Add proper JSDoc documentation for all functions
- **Error Handling**: Implement comprehensive error handling
- **Timeouts**: Include timeouts for all network operations
- **Logging**: Use the built-in logging system for all messages

### Architecture

Hosby CLI follows a modular architecture with clear separation of concerns:

- **Commands**: Interface with the user and orchestrate operations
- **Services**: Implement business logic and core functionality
- **Core**: Provide fundamental utilities and shared functionality
- **Helpers**: Offer supporting utilities and helper functions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

- [Open an issue](https://github.com/hosby/hosby-cli/issues) on GitHub
- Contact support at support@hosby.io
- Visit our [documentation](https://docs.hosby.io)

---

<p align="center">
  <strong>Hosby CLI v0.3.0</strong><br>
  Made with ❤️ by the Hosby Team
</p>

