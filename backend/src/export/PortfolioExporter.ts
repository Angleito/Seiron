/**
 * Portfolio Exporter - Export/Import functionality for portfolio data
 * Provides comprehensive data serialization, backup, and restore capabilities
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  PortfolioSnapshot,
  PortfolioMetrics,
  PortfolioPerformance,
  RiskMetrics,
  WalletAddress,
  PortfolioExport,
  ImportResult,
  AsyncResult
} from '../types/portfolio';
import { PortfolioState } from '../state/PortfolioState';
import { PortfolioAnalytics } from '../analytics/PortfolioAnalytics';
import logger from '../utils/logger';

export interface ExportConfig {
  includeHistory: boolean;
  includeMetrics: boolean;
  includePerformance: boolean;
  includeRisks: boolean;
  maxHistoryLength: number;
  compression: boolean;
  encryption: boolean;
  encryptionKey?: string;
  outputFormat: 'json' | 'csv' | 'xlsx';
  outputDirectory: string;
}

export interface ImportConfig {
  validateData: boolean;
  mergeStrategy: 'overwrite' | 'merge' | 'skip_existing';
  restoreHistory: boolean;
  restoreMetrics: boolean;
  maxAge: number; // Maximum age of data to import (in days)
}

export interface ExportMetadata {
  exportId: string;
  timestamp: string;
  version: string;
  walletAddress: WalletAddress;
  dataSize: number;
  checksum: string;
  format: string;
  compressed: boolean;
  encrypted: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

export class PortfolioExporter {
  private readonly config: ExportConfig;
  private readonly version = '1.0.0';

  constructor(
    private portfolioState: PortfolioState,
    private analytics: PortfolioAnalytics,
    config: Partial<ExportConfig> = {}
  ) {
    this.config = {
      includeHistory: true,
      includeMetrics: true,
      includePerformance: true,
      includeRisks: true,
      maxHistoryLength: 100,
      compression: false,
      encryption: false,
      outputFormat: 'json',
      outputDirectory: './exports',
      ...config
    };
  }

  /**
   * Export complete portfolio data for a wallet
   */
  public exportPortfolio = (
    walletAddress: WalletAddress,
    customConfig?: Partial<ExportConfig>
  ): AsyncResult<{ exportPath: string; metadata: ExportMetadata }> => {
    const effectiveConfig = { ...this.config, ...customConfig };
    
    return pipe(
      this.gatherExportData(walletAddress, effectiveConfig),
      TE.chain(exportData => this.createExportFile(exportData, effectiveConfig)),
      TE.map(({ exportPath, metadata }) => {
        logger.info(`Portfolio exported for ${walletAddress}: ${exportPath}`);
        return { exportPath, metadata };
      })
    );
  };

  /**
   * Export portfolio data to specific format
   */
  public exportToFormat = (
    walletAddress: WalletAddress,
    format: 'json' | 'csv' | 'xlsx',
    outputPath?: string
  ): AsyncResult<string> => {
    const customConfig: Partial<ExportConfig> = {
      outputFormat: format,
      ...(outputPath && { outputDirectory: path.dirname(outputPath) })
    };

    return pipe(
      this.exportPortfolio(walletAddress, customConfig),
      TE.map(({ exportPath }) => exportPath)
    );
  };

  /**
   * Import portfolio data from file
   */
  public importPortfolio = (
    filePath: string,
    importConfig?: Partial<ImportConfig>
  ): AsyncResult<ImportResult> => {
    const effectiveConfig: ImportConfig = {
      validateData: true,
      mergeStrategy: 'merge',
      restoreHistory: true,
      restoreMetrics: true,
      maxAge: 30, // 30 days
      ...importConfig
    };

    return pipe(
      this.loadImportFile(filePath),
      TE.chain(exportData => this.validateImportData(exportData, effectiveConfig)),
      TE.chain(exportData => this.processImportData(exportData, effectiveConfig)),
      TE.map(result => {
        logger.info(`Portfolio import completed: ${result.importedSnapshots} snapshots imported`);
        return result;
      })
    );
  };

  /**
   * Create backup of all portfolio data
   */
  public createBackup = (
    walletAddresses: WalletAddress[],
    backupPath?: string
  ): AsyncResult<{ backupPath: string; walletsBackedUp: number }> => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(this.config.outputDirectory, `portfolio-backup-${timestamp}`);
    const effectiveBackupPath = backupPath || defaultPath;

    return pipe(
      this.ensureDirectoryExists(effectiveBackupPath),
      TE.chain(() => 
        TE.sequenceArray(
          walletAddresses.map(address => 
            this.exportPortfolio(address, {
              outputDirectory: effectiveBackupPath,
              includeHistory: true,
              includeMetrics: true,
              includePerformance: true,
              includeRisks: true
            })
          )
        )
      ),
      TE.chain(results => this.createBackupManifest(effectiveBackupPath, results)),
      TE.map(() => ({
        backupPath: effectiveBackupPath,
        walletsBackedUp: walletAddresses.length
      }))
    );
  };

  /**
   * Restore from backup
   */
  public restoreFromBackup = (
    backupPath: string,
    importConfig?: Partial<ImportConfig>
  ): AsyncResult<{ walletsRestored: number; errors: string[] }> => {
    return pipe(
      this.loadBackupManifest(backupPath),
      TE.chain(manifest => this.processBackupRestore(backupPath, manifest, importConfig)),
      TE.map(result => {
        logger.info(`Backup restore completed: ${result.walletsRestored} wallets restored`);
        return result;
      })
    );
  };

  /**
   * Validate export file integrity
   */
  public validateExportFile = (filePath: string): AsyncResult<{
    valid: boolean;
    errors: ValidationError[];
    metadata: ExportMetadata;
  }> => {
    return pipe(
      this.loadImportFile(filePath),
      TE.chain(exportData => this.performValidation(exportData)),
      TE.map(({ valid, errors }) => ({
        valid,
        errors,
        metadata: exportData.metadata as ExportMetadata
      }))
    );
  };

  /**
   * Get export file information
   */
  public getExportInfo = (filePath: string): AsyncResult<ExportMetadata> => {
    return pipe(
      this.loadImportFile(filePath),
      TE.map(exportData => exportData.metadata as ExportMetadata)
    );
  };

  /**
   * List available backups in directory
   */
  public listBackups = (backupDirectory?: string): AsyncResult<{
    path: string;
    timestamp: string;
    walletCount: number;
  }[]> => {
    const searchDir = backupDirectory || this.config.outputDirectory;
    
    return TE.tryCatch(
      async () => {
        const entries = await fs.readdir(searchDir, { withFileTypes: true });
        const backupDirs = entries.filter(entry => 
          entry.isDirectory() && entry.name.startsWith('portfolio-backup-')
        );

        const backups = [];
        for (const dir of backupDirs) {
          const backupPath = path.join(searchDir, dir.name);
          const manifestPath = path.join(backupPath, 'backup-manifest.json');
          
          try {
            const manifestData = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestData);
            
            backups.push({
              path: backupPath,
              timestamp: manifest.timestamp,
              walletCount: manifest.exports.length
            });
          } catch (error) {
            // Skip invalid backups
            logger.warn(`Invalid backup directory: ${backupPath}`);
          }
        }

        return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },
      (error) => new Error(`Failed to list backups: ${error}`)
    );
  };

  // ===================== Private Methods =====================

  private gatherExportData = (
    walletAddress: WalletAddress,
    config: ExportConfig
  ): AsyncResult<PortfolioExport> => {
    return pipe(
      TE.Do,
      TE.bind('currentSnapshot', () => this.getCurrentSnapshot(walletAddress)),
      TE.bind('history', () => config.includeHistory 
        ? this.getHistory(walletAddress, config.maxHistoryLength)
        : TE.right([])
      ),
      TE.bind('metrics', () => config.includeMetrics
        ? this.getMetrics(walletAddress)
        : TE.right(null)
      ),
      TE.bind('performance', () => config.includePerformance
        ? this.getPerformance(walletAddress)
        : TE.right([])
      ),
      TE.bind('risks', () => config.includeRisks
        ? this.getRisks(walletAddress)
        : TE.right(null)
      ),
      TE.map(({ currentSnapshot, history, metrics, performance, risks }) => {
        const exportData: PortfolioExport = {
          version: this.version,
          exportDate: new Date().toISOString(),
          walletAddress,
          data: {
            snapshot: currentSnapshot,
            history,
            metrics: metrics!,
            performance,
            risks: risks!
          },
          metadata: {
            exportedBy: 'PortfolioExporter',
            networkId: 1329, // Sei Network
            blockNumber: 0 // Would be actual block number
          }
        };

        return exportData;
      })
    );
  };

  private createExportFile = (
    exportData: PortfolioExport,
    config: ExportConfig
  ): AsyncResult<{ exportPath: string; metadata: ExportMetadata }> => {
    return pipe(
      this.ensureDirectoryExists(config.outputDirectory),
      TE.chain(() => this.serializeData(exportData, config)),
      TE.chain(({ serializedData, metadata }) => 
        this.writeExportFile(serializedData, metadata, config)
      )
    );
  };

  private serializeData = (
    exportData: PortfolioExport,
    config: ExportConfig
  ): AsyncResult<{ serializedData: string | Buffer; metadata: ExportMetadata }> => {
    return TE.tryCatch(
      async () => {
        let serializedData: string | Buffer;
        
        switch (config.outputFormat) {
          case 'json':
            serializedData = JSON.stringify(exportData, null, 2);
            break;
          case 'csv':
            serializedData = this.convertToCSV(exportData);
            break;
          case 'xlsx':
            serializedData = await this.convertToXLSX(exportData);
            break;
          default:
            throw new Error(`Unsupported format: ${config.outputFormat}`);
        }

        // Apply compression if enabled
        if (config.compression) {
          const zlib = await import('zlib');
          serializedData = zlib.gzipSync(serializedData);
        }

        // Apply encryption if enabled
        if (config.encryption && config.encryptionKey) {
          serializedData = this.encryptData(serializedData, config.encryptionKey);
        }

        const checksum = crypto
          .createHash('sha256')
          .update(serializedData)
          .digest('hex');

        const metadata: ExportMetadata = {
          exportId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: this.version,
          walletAddress: exportData.walletAddress,
          dataSize: Buffer.isBuffer(serializedData) ? serializedData.length : Buffer.byteLength(serializedData),
          checksum,
          format: config.outputFormat,
          compressed: config.compression,
          encrypted: config.encryption
        };

        return { serializedData, metadata };
      },
      (error) => new Error(`Failed to serialize data: ${error}`)
    );
  };

  private writeExportFile = (
    data: string | Buffer,
    metadata: ExportMetadata,
    config: ExportConfig
  ): AsyncResult<{ exportPath: string; metadata: ExportMetadata }> => {
    return TE.tryCatch(
      async () => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = this.getFileExtension(config);
        const filename = `portfolio-${metadata.walletAddress}-${timestamp}.${extension}`;
        const exportPath = path.join(config.outputDirectory, filename);

        await fs.writeFile(exportPath, data);

        // Write metadata file
        const metadataPath = exportPath.replace(`.${extension}`, '.meta.json');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        return { exportPath, metadata };
      },
      (error) => new Error(`Failed to write export file: ${error}`)
    );
  };

  private loadImportFile = (filePath: string): AsyncResult<PortfolioExport> => {
    return TE.tryCatch(
      async () => {
        const data = await fs.readFile(filePath);
        
        // Try to load metadata to determine format
        const metadataPath = filePath.replace(/\.[^.]+$/, '.meta.json');
        let metadata: ExportMetadata | null = null;
        
        try {
          const metadataData = await fs.readFile(metadataPath, 'utf-8');
          metadata = JSON.parse(metadataData);
        } catch {
          // Metadata file not found, try to infer format
        }

        let processedData = data;

        // Handle encryption
        if (metadata?.encrypted) {
          if (!this.config.encryptionKey) {
            throw new Error('Encrypted file requires encryption key');
          }
          processedData = this.decryptData(data, this.config.encryptionKey);
        }

        // Handle compression
        if (metadata?.compressed) {
          const zlib = await import('zlib');
          processedData = zlib.gunzipSync(processedData);
        }

        // Parse based on format
        let exportData: PortfolioExport;
        const format = metadata?.format || this.inferFormat(filePath);
        
        switch (format) {
          case 'json':
            exportData = JSON.parse(processedData.toString());
            break;
          case 'csv':
            exportData = this.parseCSV(processedData.toString());
            break;
          case 'xlsx':
            exportData = await this.parseXLSX(processedData);
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        return exportData;
      },
      (error) => new Error(`Failed to load import file: ${error}`)
    );
  };

  private validateImportData = (
    exportData: PortfolioExport,
    config: ImportConfig
  ): AsyncResult<PortfolioExport> => {
    return TE.tryCatch(
      async () => {
        if (!config.validateData) {
          return exportData;
        }

        const errors: ValidationError[] = [];

        // Validate version compatibility
        if (exportData.version !== this.version) {
          errors.push({
            field: 'version',
            message: `Version mismatch: expected ${this.version}, got ${exportData.version}`,
            severity: 'warning'
          });
        }

        // Validate data age
        const exportDate = new Date(exportData.exportDate);
        const maxAgeMs = config.maxAge * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - exportDate.getTime() > maxAgeMs;
        
        if (isExpired) {
          errors.push({
            field: 'exportDate',
            message: `Data is older than ${config.maxAge} days`,
            severity: 'warning'
          });
        }

        // Validate required fields
        if (!exportData.walletAddress) {
          errors.push({
            field: 'walletAddress',
            message: 'Missing wallet address',
            severity: 'error'
          });
        }

        if (!exportData.data.snapshot) {
          errors.push({
            field: 'snapshot',
            message: 'Missing portfolio snapshot',
            severity: 'error'
          });
        }

        // Check for critical errors
        const criticalErrors = errors.filter(e => e.severity === 'error');
        if (criticalErrors.length > 0) {
          throw new Error(`Validation failed: ${criticalErrors.map(e => e.message).join(', ')}`);
        }

        return exportData;
      },
      (error) => new Error(`Validation failed: ${error}`)
    );
  };

  private processImportData = (
    exportData: PortfolioExport,
    config: ImportConfig
  ): AsyncResult<ImportResult> => {
    return pipe(
      TE.Do,
      TE.bind('currentState', () => this.getCurrentState(exportData.walletAddress)),
      TE.chain(({ currentState }) => this.mergeImportData(exportData, currentState, config)),
      TE.map((result) => result)
    );
  };

  private mergeImportData = (
    exportData: PortfolioExport,
    currentState: any,
    config: ImportConfig
  ): AsyncResult<ImportResult> => {
    return TE.tryCatch(
      async () => {
        const result: ImportResult = {
          success: true,
          importedSnapshots: 0,
          errors: [],
          warnings: []
        };

        // Import main snapshot
        if (exportData.data.snapshot) {
          // Apply merge strategy
          switch (config.mergeStrategy) {
            case 'overwrite':
              await this.portfolioState.updateSnapshot(
                exportData.walletAddress,
                exportData.data.snapshot
              )();
              result.importedSnapshots++;
              break;
            case 'merge':
              // Merge logic would go here
              result.importedSnapshots++;
              break;
            case 'skip_existing':
              if (!currentState) {
                await this.portfolioState.updateSnapshot(
                  exportData.walletAddress,
                  exportData.data.snapshot
                )();
                result.importedSnapshots++;
              }
              break;
          }
        }

        // Import history if enabled
        if (config.restoreHistory && exportData.data.history) {
          // History import logic would go here
          result.importedSnapshots += exportData.data.history.length;
        }

        return result;
      },
      (error) => new Error(`Failed to merge import data: ${error}`)
    );
  };

  // Helper methods for different formats
  private convertToCSV = (exportData: PortfolioExport): string => {
    // Simplified CSV conversion - would need more comprehensive implementation
    const lines = [
      'timestamp,totalValueUSD,totalSuppliedUSD,totalBorrowedUSD,healthFactor',
      [
        exportData.data.snapshot.timestamp,
        exportData.data.snapshot.totalValueUSD,
        exportData.data.snapshot.totalSuppliedUSD,
        exportData.data.snapshot.totalBorrowedUSD,
        exportData.data.snapshot.healthFactor
      ].join(',')
    ];

    return lines.join('\n');
  };

  private convertToXLSX = async (exportData: PortfolioExport): Promise<Buffer> => {
    // Would use a library like xlsx to create Excel files
    // For now, return JSON as buffer
    return Buffer.from(JSON.stringify(exportData, null, 2));
  };

  private parseCSV = (csvData: string): PortfolioExport => {
    // Simplified CSV parsing - would need more comprehensive implementation
    throw new Error('CSV import not yet implemented');
  };

  private parseXLSX = async (xlsxData: Buffer): Promise<PortfolioExport> => {
    // Would use a library like xlsx to parse Excel files
    throw new Error('XLSX import not yet implemented');
  };

  private encryptData = (data: string | Buffer, key: string): Buffer => {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  };

  private decryptData = (encryptedData: Buffer, key: string): Buffer => {
    const algorithm = 'aes-256-gcm';
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    
    const decipher = crypto.createDecipher(algorithm, key);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  };

  private getFileExtension = (config: ExportConfig): string => {
    const extensions = {
      json: config.compression ? 'json.gz' : 'json',
      csv: config.compression ? 'csv.gz' : 'csv',
      xlsx: config.compression ? 'xlsx.gz' : 'xlsx'
    };

    return extensions[config.outputFormat];
  };

  private inferFormat = (filePath: string): string => {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext.includes('json')) return 'json';
    if (ext.includes('csv')) return 'csv';
    if (ext.includes('xlsx')) return 'xlsx';
    
    return 'json'; // Default
  };

  private getCurrentSnapshot = (walletAddress: WalletAddress): AsyncResult<any> => {
    return TE.tryCatch(
      async () => {
        const stateOption = this.portfolioState.getCurrentSnapshot(walletAddress);
        if (stateOption._tag === 'None') {
          throw new Error(`No portfolio data found for ${walletAddress}`);
        }
        return stateOption.value;
      },
      (error) => new Error(`Failed to get current snapshot: ${error}`)
    );
  };

  private getHistory = (walletAddress: WalletAddress, limit: number): AsyncResult<any[]> => {
    return TE.tryCatch(
      async () => {
        const historyOption = this.portfolioState.getHistory(walletAddress, limit);
        return historyOption._tag === 'Some' ? historyOption.value : [];
      },
      (error) => new Error(`Failed to get history: ${error}`)
    );
  };

  private getMetrics = (walletAddress: WalletAddress): AsyncResult<any> => {
    return TE.right(null); // Would implement actual metrics retrieval
  };

  private getPerformance = (walletAddress: WalletAddress): AsyncResult<any[]> => {
    return TE.right([]); // Would implement actual performance retrieval
  };

  private getRisks = (walletAddress: WalletAddress): AsyncResult<any> => {
    return TE.right(null); // Would implement actual risk retrieval
  };

  private getCurrentState = (walletAddress: WalletAddress): AsyncResult<any> => {
    return TE.tryCatch(
      async () => {
        const stateOption = this.portfolioState.getCurrentState(walletAddress);
        return stateOption._tag === 'Some' ? stateOption.value : null;
      },
      (error) => new Error(`Failed to get current state: ${error}`)
    );
  };

  private ensureDirectoryExists = (dirPath: string): AsyncResult<void> => {
    return TE.tryCatch(
      async () => {
        await fs.mkdir(dirPath, { recursive: true });
      },
      (error) => new Error(`Failed to create directory: ${error}`)
    );
  };

  private createBackupManifest = (
    backupPath: string,
    exports: { exportPath: string; metadata: ExportMetadata }[]
  ): AsyncResult<void> => {
    return TE.tryCatch(
      async () => {
        const manifest = {
          timestamp: new Date().toISOString(),
          version: this.version,
          exports: exports.map(exp => ({
            walletAddress: exp.metadata.walletAddress,
            filename: path.basename(exp.exportPath),
            metadata: exp.metadata
          }))
        };

        const manifestPath = path.join(backupPath, 'backup-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      },
      (error) => new Error(`Failed to create backup manifest: ${error}`)
    );
  };

  private loadBackupManifest = (backupPath: string): AsyncResult<any> => {
    return TE.tryCatch(
      async () => {
        const manifestPath = path.join(backupPath, 'backup-manifest.json');
        const manifestData = await fs.readFile(manifestPath, 'utf-8');
        return JSON.parse(manifestData);
      },
      (error) => new Error(`Failed to load backup manifest: ${error}`)
    );
  };

  private processBackupRestore = (
    backupPath: string,
    manifest: any,
    importConfig?: Partial<ImportConfig>
  ): AsyncResult<{ walletsRestored: number; errors: string[] }> => {
    return TE.tryCatch(
      async () => {
        const result = { walletsRestored: 0, errors: [] };

        for (const exportInfo of manifest.exports) {
          try {
            const filePath = path.join(backupPath, exportInfo.filename);
            await this.importPortfolio(filePath, importConfig)();
            result.walletsRestored++;
          } catch (error) {
            result.errors.push(`Failed to restore ${exportInfo.walletAddress}: ${error}`);
          }
        }

        return result;
      },
      (error) => new Error(`Failed to process backup restore: ${error}`)
    );
  };

  private performValidation = (exportData: PortfolioExport): AsyncResult<{
    valid: boolean;
    errors: ValidationError[];
  }> => {
    return TE.tryCatch(
      async () => {
        const errors: ValidationError[] = [];

        // Basic structure validation
        if (!exportData.version) {
          errors.push({
            field: 'version',
            message: 'Missing version information',
            severity: 'error'
          });
        }

        if (!exportData.walletAddress) {
          errors.push({
            field: 'walletAddress',
            message: 'Missing wallet address',
            severity: 'error'
          });
        }

        if (!exportData.data) {
          errors.push({
            field: 'data',
            message: 'Missing portfolio data',
            severity: 'error'
          });
        }

        return {
          valid: errors.filter(e => e.severity === 'error').length === 0,
          errors
        };
      },
      (error) => new Error(`Validation failed: ${error}`)
    );
  };
}