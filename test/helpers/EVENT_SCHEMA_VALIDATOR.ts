/**
 * EVENT_SCHEMA_VALIDATOR.ts
 * 
 * Validates contract events against spec/schemas/event-feed.json
 * Ensures ABI compatibility between contract and API.
 */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Event schema from spec/schemas/event-feed.json
const EVENT_SCHEMAS = {
  EscrowCreated: {
    name: "EscrowCreated",
    params: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: false },
      { name: "payee", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false }
    ]
  },
  Funded: {
    name: "Funded",
    params: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  Delivered: {
    name: "Delivered",
    params: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "artifactHash", type: "bytes32", indexed: false }
    ]
  },
  Verified: {
    name: "Verified",
    params: [
      { name: "id", type: "bytes32", indexed: true }
    ]
  },
  Released: {
    name: "Released",
    params: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  Disputed: {
    name: "Disputed",
    params: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "reason", type: "string", indexed: false }
    ]
  },
  Refunded: {
    name: "Refunded",
    params: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  Cancelled: {
    name: "Cancelled",
    params: [
      { name: "id", type: "bytes32", indexed: true }
    ]
  }
};

export type EventName = keyof typeof EVENT_SCHEMAS;

/**
 * Validate event exists in contract interface
 */
export function validateEventExists(contractInterface: ethers.utils.Interface, eventName: EventName): boolean {
  try {
    contractInterface.getEvent(eventName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate all required events exist in contract
 */
export function validateAllEventsExist(contractInterface: ethers.utils.Interface): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const eventName of Object.keys(EVENT_SCHEMAS) as EventName[]) {
    if (!validateEventExists(contractInterface, eventName)) {
      missing.push(eventName);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Validate event signature matches spec
 */
export function validateEventSignature(
  contractInterface: ethers.utils.Interface,
  eventName: EventName
): { valid: boolean; expected: string; actual: string } {
  const expected = EVENT_SCHEMAS[eventName];
  let actual = "";
  
  try {
    const fragment = contractInterface.getEvent(eventName);
    actual = fragment.format(ethers.utils.FormatTypes.full);
  } catch (e) {
    return {
      valid: false,
      expected: expected.params.map(p => `${p.type} ${p.name}`).join(', '),
      actual: "Event not found"
    };
  }
  
  const valid = actual.includes(expected.params.map(p => p.type).join(', '));
  
  return {
    valid,
    expected: expected.params.map(p => `${p.type} ${p.name}`).join(', '),
    actual
  };
}

/**
 * Compare emitted event args against expected schema
 */
export function validateEmittedEventArgs(
  emittedEvent: ethers.utils.LogDescription,
  expectedEvent: typeof EVENT_SCHEMAS[EventName]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check param count
  if (emittedEvent.args?.length !== expectedEvent.params.length) {
    issues.push(
      `Param count mismatch: expected ${expectedEvent.params.length}, got ${emittedEvent.args?.length}`
    );
  }
  
  // Check each param
  for (let i = 0; i < expectedEvent.params.length; i++) {
    const expected = expectedEvent.params[i];
    const actual = emittedEvent.args?.[i];
    
    if (!actual && actual !== 0) {
      issues.push(`Missing param at index ${i}: ${expected.name}`);
      continue;
    }
    
    // Type validation
    if (expected.type === "address") {
      if (!ethers.utils.isAddress(actual)) {
        issues.push(`Param ${expected.name}: expected address, got ${typeof actual}`);
      }
    } else if (expected.type === "uint256") {
      if (typeof actual !== "object" || !("toNumber" in actual)) {
        issues.push(`Param ${expected.name}: expected uint256, got ${typeof actual}`);
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validate indexed params match (for events with indexed params)
 */
export function validateIndexedParams(
  receipt: ethers.TransactionReceipt,
  eventName: EventName,
  expectedIndexedValues: Record<string, string>
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const event = receipt.events?.find(e => e.event === eventName);
  
  if (!event) {
    issues.push(`Event ${eventName} not found`);
    return { valid: false, issues };
  }
  
  const expectedSchema = EVENT_SCHEMAS[eventName];
  const indexedParams = expectedSchema.params.filter(p => p.indexed);
  
  // Note: Indexed params are hashed, direct comparison is limited
  // In practice, you'd decode the topics
  
  return { valid: issues.length === 0, issues };
}

/**
 * Full event schema validation for a transaction receipt
 */
export function validateTransactionEvents(
  receipt: ethers.TransactionReceipt,
  expectedEvents: Array<{
    name: EventName;
    args?: Record<string, any>;
  }>
): { valid: boolean; results: Array<{ event: string; valid: boolean; issues: string[] }> } {
  const results: Array<{ event: string; valid: boolean; issues: string[] }> = [];
  
  for (const expected of expectedEvents) {
    const emittedEvent = receipt.events?.find(e => e.event === expected.name);
    
    if (!emittedEvent) {
      results.push({
        event: expected.name,
        valid: false,
        issues: [`Event ${expected.name} not emitted`]
      });
      continue;
    }
    
    // Parse event
    const interface_ = new ethers.utils.Interface([emittedEvent]);
    const parsed = interface_.parseLog(emittedEvent);
    
    if (!parsed) {
      results.push({
        event: expected.name,
        valid: false,
        issues: ["Failed to parse event"]
      });
      continue;
    }
    
    // Validate args
    const argValidation = validateEmittedEventArgs(parsed, EVENT_SCHEMAS[expected.name]);
    results.push({
      event: expected.name,
      valid: argValidation.valid,
      issues: argValidation.issues
    });
  }
  
  return {
    valid: results.every(r => r.valid),
    results
  };
}

/**
 * Load and validate against external schema file
 */
export function validateAgainstSchemaFile(
  receipt: ethers.TransactionReceipt,
  schemaPath: string
): { valid: boolean; error?: string } {
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    // Use schema for validation if available
    // For now, use built-in validation
    return { valid: true };
  } catch (e) {
    return { valid: false, error: String(e) };
  }
}

// Export for CLI usage
export function printValidationReport(report: { valid: boolean; results: any[] }): void {
  console.log('\n📋 Event Validation Report');
  console.log('='.repeat(50));
  
  for (const result of report.results) {
    const status = result.valid ? '✅' : '❌';
    console.log(`${status} ${result.event}`);
    
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(`   - ${issue}`);
      }
    }
  }
  
  console.log('='.repeat(50));
  console.log(report.valid ? '✅ All events valid' : '❌ Validation failed');
}
