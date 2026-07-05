# Postra NodeJS SDK

This is the NodeJS SDK for [Postra](https://postra.co.uk).

You can start by installing the package:

```bash
npm install @postra/node
```

## Usage
```typescript
import Postra from '@postra/node';
const postra = new Postra('your api key', 'your self-hosted instance (optional)');
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post to Postra
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file to Postra
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can use the SDK with curl, check the [Postra API documentation](https://docs.postra.co.uk/public-api) for more information.