/**
 * Import/Export Controls Component
 * 
 * Provides UI controls for importing and exporting scenarios as Excel files.
 * Integrated with the scenario builder and library systems.
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportExportControlsProps {
  onImportComplete?: (result: { scenarios: number; regions: number }) => void;
  onExportComplete?: () => void;
  className?: string;
}

interface ImportResult {
  success: boolean;
  imported?: {
    scenarios: number;
    regions: number;
  };
  scenarios?: any[];
  regions?: any[];
  error?: string;
  details?: string[];
}

export function ImportExportControls({ 
  onImportComplete, 
  onExportComplete, 
  className = "" 
}: ImportExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Call export API
      const response = await fetch('/api/scenarios/export?userId=demo-user', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenarios_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      onExportComplete?.();
      
    } catch (error) {
      console.error('Export failed:', error);
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportResult(null);

      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', 'demo-user');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      // Call import API
      const response = await fetch('/api/scenarios/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      const result: ImportResult = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
      onImportComplete?.(result.imported || { scenarios: 0, regions: 0 });
      
      // Clear file selection
      setSelectedFile(null);
      const fileInput = document.getElementById('excel-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const clearResults = () => {
    setImportResult(null);
    setSelectedFile(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Export Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-orange-400" />
            Export Scenarios
          </CardTitle>
          <CardDescription className="text-slate-300">
            Download all your scenarios and regions as an Excel file for backup or sharing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-export-excel"
          >
            {isExporting ? (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4 animate-pulse" />
                Generating Excel File...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-400" />
            Import Scenarios
          </CardTitle>
          <CardDescription className="text-slate-300">
            Upload an Excel file to import scenarios and regions into your library
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0 file:rounded"
              data-testid="input-import-file"
            />
            {selectedFile && (
              <p className="text-sm text-slate-400">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-slate-400 text-center">
                Processing file... {importProgress}%
              </p>
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            data-testid="button-import-excel"
          >
            {isImporting ? (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4 animate-pulse" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import from Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {importResult && (
        <Card className={`border-2 ${importResult.success ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                {importResult.success ? (
                  <div>
                    <h4 className="font-semibold text-green-400 mb-2">Import Successful!</h4>
                    <p className="text-slate-300 text-sm mb-2">
                      Successfully imported {importResult.imported?.scenarios || 0} scenarios 
                      and {importResult.imported?.regions || 0} regions.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-red-400 mb-2">Import Failed</h4>
                    <p className="text-slate-300 text-sm mb-2">{importResult.error}</p>
                    {importResult.details && importResult.details.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-1">Validation errors:</p>
                        <ul className="text-xs text-red-300 space-y-1">
                          {importResult.details.slice(0, 5).map((detail, index) => (
                            <li key={index}>• {detail}</li>
                          ))}
                          {importResult.details.length > 5 && (
                            <li>• ... and {importResult.details.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearResults}
                  className="mt-2 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Alert className="bg-slate-800/30 border-slate-600">
        <FileSpreadsheet className="h-4 w-4 text-orange-400" />
        <AlertDescription className="text-slate-300">
          <strong>Excel Format:</strong> The file should have "Scenarios" and "Regions" sheets. 
          Export an existing file first to see the expected format, then modify and re-import.
        </AlertDescription>
      </Alert>
    </div>
  );
}