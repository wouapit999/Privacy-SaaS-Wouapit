import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { EvidenceService } from './evidence.service';
import { RobotsService } from './robots.service';
import { GithubConnector } from './connectors/github.connector';
import { RedditConnector } from './connectors/reddit.connector';
import { XConnector } from './connectors/x.connector';
import { LinkedInConnector } from './connectors/linkedin.connector';
import { WebSearchConnector } from './connectors/web-search.connector';

@Module({
  providers: [
    DiscoveryService,
    EvidenceService,
    RobotsService,
    GithubConnector,
    RedditConnector,
    XConnector,
    LinkedInConnector,
    WebSearchConnector,
  ],
  exports: [DiscoveryService, RobotsService],
})
export class DiscoveryModule {}
