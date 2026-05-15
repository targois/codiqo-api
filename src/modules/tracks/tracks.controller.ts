import { BadRequestException, Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProgrammingLanguage, User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TracksService } from './tracks.service';

const LANGUAGE_BY_SLUG: Record<string, ProgrammingLanguage> = {
  python: 'PYTHON',
  javascript: 'JAVASCRIPT',
  typescript: 'TYPESCRIPT',
  html_css: 'HTML_CSS',
  'html-css': 'HTML_CSS',
  react: 'REACT',
};

@ApiTags('Tracks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get(':language')
  @ApiOperation({ summary: 'Get track view: course → sections → lessons with lock + progress' })
  @ApiResponse({ status: 200, description: 'Full track structure for the language' })
  @ApiResponse({ status: 404, description: 'No published course for this language' })
  async getTrack(
    @Param('language') language: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const enumValue = LANGUAGE_BY_SLUG[language.toLowerCase()];
    if (!enumValue) throw new BadRequestException('Unknown language');
    const track = await this.tracksService.getTrackView(user.id, enumValue);
    return { track };
  }
}
